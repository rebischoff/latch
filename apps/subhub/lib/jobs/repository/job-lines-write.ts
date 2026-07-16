import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { tableExists } from "@/lib/sites/repository/sql-utils";

import type { JobLineItemPatchRow } from "../descriptors/job-detail";
import { recalcJobLineItems } from "./job-line-recalc";
import { seedScopePhasesForJobLineTx } from "./scope-phase-seed";

type PriorLine = {
  id: string;
  quantity: number;
  sold_quantity: number;
  sold_unit_price: number;
  sold_unit_cost: number;
  sold_unit_material: number;
  sold_unit_labor: number;
  sold_unit_freight: number;
  sold_unit_incidental: number;
};

const num = (value: unknown): number => Number(value ?? 0);

/**
 * Scope-E1: a line that carries any sold value ($) may not be deleted directly —
 * it must be reduced through a change order (wave 5d). Zero-sold lines (e.g. new
 * engineering adds) delete freely. Contract ext uses sold_quantity (47 JLI).
 */
export const soldLineBlocksDelete = (line: {
  sold_unit_price: number;
  sold_quantity: number;
}): boolean =>
  line.sold_unit_price > 0 || line.sold_unit_price * line.sold_quantity > 0;

const allocatedSum = (row: JobLineItemPatchRow): number =>
  (row.allocations ?? []).reduce((sum, alloc) => sum + Number(alloc.quantity), 0);

const syncQuantityFromAllocations = (
  row: JobLineItemPatchRow,
): JobLineItemPatchRow => {
  if (row.qty_manual) {
    return { ...row, qty_manual: true, allocations: [] };
  }
  const allocated = allocatedSum(row);
  const quantity = allocated > 0 ? allocated : row.quantity > 0 ? row.quantity : 1;
  return { ...row, qty_manual: false, quantity };
};

const loadPriorLines = async (
  client: PoolClient,
  jobId: string,
): Promise<Map<string, PriorLine>> => {
  const result = await client.query<PriorLine>(
    `SELECT id, quantity, sold_quantity, sold_unit_price, sold_unit_cost,
            sold_unit_material, sold_unit_labor, sold_unit_freight, sold_unit_incidental
     FROM job_line WHERE job_id = $1`,
    [jobId],
  );
  return new Map(
    result.rows.map((row) => [
      row.id,
      {
        id: row.id,
        quantity: num(row.quantity),
        sold_quantity: num(row.sold_quantity),
        sold_unit_price: num(row.sold_unit_price),
        sold_unit_cost: num(row.sold_unit_cost),
        sold_unit_material: num(row.sold_unit_material),
        sold_unit_labor: num(row.sold_unit_labor),
        sold_unit_freight: num(row.sold_unit_freight),
        sold_unit_incidental: num(row.sold_unit_incidental),
      },
    ]),
  );
};

const validateLineItems = (
  rows: JobLineItemPatchRow[],
  validConditionIds: Set<string> | null,
): Array<JobLineItemPatchRow & { id: string }> => {
  const normalized = rows.map((row) => ({
    ...syncQuantityFromAllocations(row),
    id: row.id ?? crypto.randomUUID(),
  }));

  const headerIds = new Set(
    normalized.filter((row) => row.line_role === "kit_header").map((row) => row.id),
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

    if (
      validConditionIds &&
      row.job_condition_id &&
      !validConditionIds.has(row.job_condition_id)
    ) {
      throw new ValidationError(
        "job_condition_id must reference a condition on this job",
        {
          field: "line_items",
          code: "unknown_condition",
          id: row.id,
          job_condition_id: row.job_condition_id,
        },
      );
    }
  }

  return normalized;
};

/** Order lines so a kit parent is written before its components (FK safe). */
const orderParentsFirst = (
  rows: Array<JobLineItemPatchRow & { id: string }>,
): Array<JobLineItemPatchRow & { id: string }> =>
  [...rows].sort(
    (a, b) =>
      Number(a.parent_line_id != null) - Number(b.parent_line_id != null),
  );

export const replaceJobLineItemsTx = async (
  client: PoolClient,
  jobId: string,
  siteId: string,
  rows: JobLineItemPatchRow[],
  validConditionIds?: Set<string>,
): Promise<void> => {
  const normalized = validateLineItems(rows, validConditionIds ?? null);
  const prior = await loadPriorLines(client, jobId);

  const payloadIds = new Set(normalized.map((row) => row.id));

  // Scope-E1: deleting a sold line ($ > 0) must go through a change order (5d).
  for (const [id, priorLine] of prior) {
    if (payloadIds.has(id)) {
      continue;
    }
    if (soldLineBlocksDelete(priorLine)) {
      throw new ValidationError(
        "Cannot delete a sold line — reduce it through a change order",
        {
          field: "line_items",
          code: "sold_line_requires_change_order",
          job_line_id: id,
        },
      );
    }
  }

  const recalculated = await recalcJobLineItems(
    client,
    normalized.map((row) => ({
      ...row,
      sales_locked: row.sales_locked ?? false,
      material_locked: row.material_locked ?? false,
    })),
  );

  const toDelete = [...prior.keys()].filter((id) => !payloadIds.has(id));
  if (toDelete.length > 0) {
    await client.query(
      `DELETE FROM job_line WHERE job_id = $1 AND id = ANY($2::text[])`,
      [jobId, toDelete],
    );
  }

  const ordered = orderParentsFirst(recalculated);
  const hasAllocations = await tableExists(client, "job_line_allocation");

  let index = 0;
  for (const row of ordered) {
    index += 1;
    const lineNumber = index;
    const sortOrder = index;
    const isExisting = prior.has(row.id);
    // Scope-F1 / 47: new lines start with $0 / sold_quantity=0; existing keep DB sold_*.
    const priorLine = prior.get(row.id);
    const soldQuantity = isExisting ? (priorLine?.sold_quantity ?? 0) : 0;
    const soldPrice = isExisting ? (priorLine?.sold_unit_price ?? 0) : 0;
    const soldCost = isExisting ? (priorLine?.sold_unit_cost ?? 0) : 0;
    const soldMaterial = isExisting ? (priorLine?.sold_unit_material ?? 0) : 0;
    const soldLabor = isExisting ? (priorLine?.sold_unit_labor ?? 0) : 0;
    const soldFreight = isExisting ? (priorLine?.sold_unit_freight ?? 0) : 0;
    const soldIncidental = isExisting ? (priorLine?.sold_unit_incidental ?? 0) : 0;

    const singleZoneId =
      (row.allocations ?? []).length === 1
        ? row.allocations![0]!.site_zone_id
        : (row.site_zone_id ?? null);

    await client.query(
      `INSERT INTO job_line (
         id, job_id, job_condition_id, parent_line_id, line_number, line_role, line_kind,
         description, quantity, sold_quantity, qty_manual, unit, unit_cost, unit_price,
         unit_material, unit_labor, unit_freight, unit_incidental, unit_price_target,
         sold_unit_price, sold_unit_cost, sold_unit_material, sold_unit_labor,
         sold_unit_freight, sold_unit_incidental,
         sales_locked, material_locked, site_zone_id, site_asset_id, item_id, part_id,
         vendor_part_id, estimate_line_id, change_order_line_id, source, status,
         superseded_by_job_line_id, sort_order
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11, $12, $13, $14,
         $15, $16, $17, $18, $19,
         $20, $21, $22, $23,
         $24, $25,
         $26, $27, $28, $29, $30, $31,
         $32, $33, $34, $35, $36,
         $37, $38
       )
       ON CONFLICT (id) DO UPDATE SET
         job_condition_id = EXCLUDED.job_condition_id,
         parent_line_id = EXCLUDED.parent_line_id,
         line_number = EXCLUDED.line_number,
         line_role = EXCLUDED.line_role,
         line_kind = EXCLUDED.line_kind,
         description = EXCLUDED.description,
         quantity = EXCLUDED.quantity,
         qty_manual = EXCLUDED.qty_manual,
         unit = EXCLUDED.unit,
         unit_cost = EXCLUDED.unit_cost,
         unit_price = EXCLUDED.unit_price,
         unit_material = EXCLUDED.unit_material,
         unit_labor = EXCLUDED.unit_labor,
         unit_freight = EXCLUDED.unit_freight,
         unit_incidental = EXCLUDED.unit_incidental,
         unit_price_target = EXCLUDED.unit_price_target,
         sales_locked = EXCLUDED.sales_locked,
         material_locked = EXCLUDED.material_locked,
         site_zone_id = EXCLUDED.site_zone_id,
         site_asset_id = EXCLUDED.site_asset_id,
         item_id = EXCLUDED.item_id,
         part_id = EXCLUDED.part_id,
         vendor_part_id = EXCLUDED.vendor_part_id,
         sort_order = EXCLUDED.sort_order`,
      [
        row.id,
        jobId,
        row.job_condition_id ?? null,
        row.parent_line_id ?? null,
        lineNumber,
        row.line_role,
        row.line_kind ?? "product",
        row.description,
        row.quantity,
        soldQuantity,
        row.qty_manual ?? false,
        row.unit,
        row.unit_cost,
        row.unit_price,
        row.unit_material,
        row.unit_labor,
        row.unit_freight,
        row.unit_incidental,
        row.unit_price_target,
        soldPrice,
        soldCost,
        soldMaterial,
        soldLabor,
        soldFreight,
        soldIncidental,
        row.sales_locked ?? false,
        row.material_locked ?? false,
        singleZoneId,
        row.site_asset_id ?? null,
        row.item_id ?? null,
        row.part_id ?? null,
        row.vendor_part_id ?? null,
        row.estimate_line_id ?? null,
        row.change_order_line_id ?? null,
        row.source ?? "manual",
        row.status ?? "active",
        row.superseded_by_job_line_id ?? null,
        sortOrder,
      ],
    );

    if (hasAllocations) {
      await client.query(
        `DELETE FROM job_line_allocation WHERE job_line_id = $1`,
        [row.id],
      );
      const seenZones = new Set<string>();
      for (const alloc of row.allocations ?? []) {
        if (seenZones.has(alloc.site_zone_id)) {
          throw new ValidationError("Duplicate site_zone_id in allocations", {
            field: "line_items",
            code: "duplicate_allocation",
            id: row.id,
            site_zone_id: alloc.site_zone_id,
          });
        }
        seenZones.add(alloc.site_zone_id);

        const zoneResult = await client.query<{ id: string }>(
          `SELECT id FROM site_zone WHERE id = $1 AND site_id = $2`,
          [alloc.site_zone_id, siteId],
        );
        if (zoneResult.rows.length === 0) {
          throw new ValidationError("Unknown site_zone_id for job site", {
            field: "line_items",
            code: "unknown_site_zone",
            id: row.id,
            site_zone_id: alloc.site_zone_id,
          });
        }

        await client.query(
          `INSERT INTO job_line_allocation (job_line_id, site_zone_id, quantity)
           VALUES ($1, $2, $3)`,
          [row.id, alloc.site_zone_id, alloc.quantity],
        );
      }
    }

    if (!isExisting && row.item_id) {
      await seedScopePhasesForJobLineTx(client, {
        job_line_id: row.id,
        item_id: row.item_id,
        estimate_condition_id: null,
        job_condition_id: row.job_condition_id ?? null,
        site_zone_id: singleZoneId,
        quantity: row.quantity,
      });
    }
  }
};

export const replaceJobLineItems = async (
  pool: Pool,
  actorId: string,
  jobId: string,
  siteId: string,
  rows: JobLineItemPatchRow[],
  validConditionIds?: Set<string>,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceJobLineItemsTx(client, jobId, siteId, rows, validConditionIds);
  });
};
