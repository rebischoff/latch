import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import type { EstimateLineItemPatchRow } from "../descriptors/estimate-detail";
import { recalcLineItems } from "./estimate-line-recalc";

const allocatedSum = (row: EstimateLineItemPatchRow): number =>
  (row.allocations ?? []).reduce((sum, alloc) => sum + Number(alloc.quantity), 0);

const syncQuantityFromAllocations = (
  row: EstimateLineItemPatchRow,
): EstimateLineItemPatchRow => {
  const qtyManual = row.qty_manual ?? false;
  if (qtyManual) {
    return { ...row, qty_manual: true };
  }

  const allocated = allocatedSum(row);
  const quantity = allocated > 0 ? allocated : row.quantity > 0 ? row.quantity : 1;
  return { ...row, qty_manual: false, quantity };
};

const validateLineItems = async (
  client: PoolClient,
  estimateId: string,
  siteId: string,
  rows: EstimateLineItemPatchRow[],
  validConditionIds: Set<string>,
): Promise<Array<EstimateLineItemPatchRow & { id: string }>> => {
  const normalized = rows.map((row) => ({
    ...syncQuantityFromAllocations(row),
    id: row.id ?? crypto.randomUUID(),
  }));

  const headerIds = new Set(
    normalized
      .filter((row) => row.line_role === "kit_header")
      .map((row) => row.id),
  );

  for (const row of normalized) {
    if (row.line_role === "kit_component") {
      if (row.parent_line_id === null || row.parent_line_id === undefined) {
        throw new ValidationError("kit_component requires parent_line_id", {
          field: "line_items",
          code: "missing_parent",
          id: row.id,
        });
      }

      if (!headerIds.has(row.parent_line_id)) {
        throw new ValidationError(
          "kit_component parent_line_id must reference a kit_header in the same payload",
          {
            field: "line_items",
            code: "orphan_component",
            id: row.id,
            parent_line_id: row.parent_line_id,
          },
        );
      }
    } else if (row.parent_line_id !== null && row.parent_line_id !== undefined) {
      throw new ValidationError("parent_line_id is only valid for kit_component rows", {
        field: "line_items",
        code: "invalid_parent",
        id: row.id,
      });
    }

    if (!row.estimate_condition_id) {
      throw new ValidationError("estimate_condition_id is required on every line", {
        field: "line_items",
        code: "missing_condition",
        id: row.id,
      });
    }

    if (!validConditionIds.has(row.estimate_condition_id)) {
      const conditionResult = await client.query<{ estimate_id: string }>(
        `SELECT estimate_id FROM estimate_condition WHERE id = $1`,
        [row.estimate_condition_id],
      );
      if (
        conditionResult.rows.length === 0 ||
        conditionResult.rows[0]?.estimate_id !== estimateId
      ) {
        throw new ValidationError(
          "estimate_condition_id must reference a condition in this estimate",
          {
            field: "line_items",
            code: "unknown_condition",
            id: row.id,
            estimate_condition_id: row.estimate_condition_id,
          },
        );
      }
    }

    if (!row.item_id) {
      throw new ValidationError("item_id is required on lines", {
        field: "line_items",
        code: "missing_item",
        id: row.id,
      });
    }

    const { rows: nodeRows } = await client.query<{ node_type: string }>(
      `SELECT node_type FROM item WHERE id = $1`,
      [row.item_id],
    );
    if (nodeRows[0]?.node_type !== "item") {
      throw new ValidationError("item_id must reference a quotable item (leaf)", {
        field: "line_items",
        code: "item_not_selectable",
        id: row.id,
        item_id: row.item_id,
      });
    }

    const allocations = row.allocations ?? [];
    const seenZones = new Set<string>();
    for (const alloc of allocations) {
      if (seenZones.has(alloc.site_zone_id)) {
        throw new ValidationError("Duplicate site_zone_id in allocations", {
          field: "line_items",
          code: "duplicate_allocation",
          id: row.id,
          site_zone_id: alloc.site_zone_id,
        });
      }
      seenZones.add(alloc.site_zone_id);

      if (!(alloc.quantity > 0)) {
        throw new ValidationError("Allocation quantity must be positive", {
          field: "line_items",
          code: "invalid_allocation_qty",
          id: row.id,
        });
      }

      const zoneResult = await client.query<{ id: string }>(
        `SELECT id FROM site_zone WHERE id = $1 AND site_id = $2`,
        [alloc.site_zone_id, siteId],
      );
      if (zoneResult.rows.length === 0) {
        throw new ValidationError("Unknown site_zone_id for estimate site", {
          field: "line_items",
          code: "unknown_site_zone",
          id: row.id,
          site_zone_id: alloc.site_zone_id,
        });
      }
    }

    const allocated = allocatedSum(row);
    if (row.qty_manual && allocated > row.quantity) {
      throw new ValidationError("Allocated quantity exceeds line quantity", {
        field: "line_items",
        code: "over_allocated",
        id: row.id,
        quantity: row.quantity,
        allocated,
      });
    }
  }

  return normalized;
};

export const replaceEstimateLineItemsTx = async (
  client: PoolClient,
  estimateId: string,
  siteId: string,
  rows: EstimateLineItemPatchRow[],
  validConditionIds: Set<string>,
  existingLineIds?: Set<string>,
): Promise<void> => {
  const normalized = await validateLineItems(
    client,
    estimateId,
    siteId,
    rows,
    validConditionIds,
  );

  const priorIds =
    existingLineIds ??
    new Set(
      (
        await client.query<{ id: string }>(
          `SELECT id FROM estimate_line WHERE estimate_id = $1`,
          [estimateId],
        )
      ).rows.map((row) => row.id),
    );

  const recalculated = await recalcLineItems(
    client,
    normalized.map((row) => ({
      ...row,
      lock: row.lock ?? "none",
    })),
    priorIds,
  );

  await client.query(`DELETE FROM estimate_line WHERE estimate_id = $1`, [
    estimateId,
  ]);

  for (const [index, row] of recalculated.entries()) {
    const lineNumber = index + 1;
    const sortOrder = index + 1;

    await client.query(
      `INSERT INTO estimate_line (
         id,
         estimate_id,
         estimate_condition_id,
         parent_line_id,
         line_number,
         line_role,
         description,
         quantity,
         qty_manual,
         unit,
         unit_cost,
         unit_price,
         unit_material,
         unit_labor,
         unit_freight,
         unit_incidental,
         unit_price_target,
         lock,
         item_id,
         part_id,
         vendor_part_id,
         sort_order
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
      [
        row.id,
        estimateId,
        row.estimate_condition_id,
        row.parent_line_id ?? null,
        lineNumber,
        row.line_role,
        row.description,
        row.quantity,
        row.qty_manual ?? false,
        row.unit,
        row.unit_cost,
        row.unit_price,
        row.unit_material,
        row.unit_labor,
        row.unit_freight,
        row.unit_incidental,
        row.unit_price_target,
        row.lock ?? "none",
        row.item_id ?? null,
        row.part_id ?? null,
        row.vendor_part_id ?? null,
        sortOrder,
      ],
    );

    for (const alloc of row.allocations ?? []) {
      await client.query(
        `INSERT INTO estimate_line_allocation (
           estimate_line_id, site_zone_id, quantity
         ) VALUES ($1, $2, $3)`,
        [row.id, alloc.site_zone_id, alloc.quantity],
      );
    }
  }
};

export const replaceEstimateLineItems = async (
  pool: Pool,
  actorId: string,
  estimateId: string,
  siteId: string,
  rows: EstimateLineItemPatchRow[],
  validConditionIds: Set<string>,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceEstimateLineItemsTx(
      client,
      estimateId,
      siteId,
      rows,
      validConditionIds,
    );
  });
};
