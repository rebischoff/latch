import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { tableExists } from "../../sites/repository/sql-utils";
import type { EstimateLineItemPatchRow } from "../descriptors/estimate-detail";
import type { CheckedZoneMembership } from "./estimate-scopes-write";

const validateLineItems = async (
  client: PoolClient,
  siteId: string,
  rows: EstimateLineItemPatchRow[],
  validScopeIds: Set<string>,
  checkedZones: CheckedZoneMembership,
): Promise<Array<EstimateLineItemPatchRow & { id: string }>> => {
  const normalized = rows.map((row) => ({
    ...row,
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
        throw new ValidationError("kit_component parent_line_id must reference a kit_header in the same payload", {
          field: "line_items",
          code: "orphan_component",
          id: row.id,
          parent_line_id: row.parent_line_id,
        });
      }
    } else if (row.parent_line_id !== null && row.parent_line_id !== undefined) {
      throw new ValidationError("parent_line_id is only valid for kit_component rows", {
        field: "line_items",
        code: "invalid_parent",
        id: row.id,
      });
    }

    if (row.line_kind === "labor" && row.phase_id) {
      if (await tableExists(client, "phase")) {
        const phaseResult = await client.query<{ id: string }>(
          `SELECT id FROM phase WHERE id = $1`,
          [row.phase_id],
        );
        if (phaseResult.rows.length === 0) {
          throw new ValidationError("Unknown phase_id on labor line", {
            field: "line_items",
            code: "unknown_phase",
            id: row.id,
          });
        }
      }
    }

    if (row.estimate_scope_id !== null && row.estimate_scope_id !== undefined) {
      if (!validScopeIds.has(row.estimate_scope_id)) {
        throw new ValidationError("estimate_scope_id must reference a scope in this estimate", {
          field: "line_items",
          code: "unknown_scope_block",
          id: row.id,
          estimate_scope_id: row.estimate_scope_id,
        });
      }
    }

    if (row.site_zone_id !== null && row.site_zone_id !== undefined) {
      const scopeId = row.estimate_scope_id ?? null;
      if (!scopeId) {
        throw new ValidationError("site_zone_id requires estimate_scope_id", {
          field: "line_items",
          code: "zone_without_scope",
          id: row.id,
          site_zone_id: row.site_zone_id,
        });
      }

      const checkedForScope = checkedZones.get(scopeId);
      if (!checkedForScope?.has(row.site_zone_id)) {
        throw new ValidationError("site_zone_id must be checked in matching scope", {
          field: "line_items",
          code: "unchecked_zone",
          id: row.id,
          site_zone_id: row.site_zone_id,
          estimate_scope_id: scopeId,
        });
      }

      const zoneResult = await client.query<{ id: string }>(
        `SELECT id FROM site_zone WHERE id = $1 AND site_id = $2`,
        [row.site_zone_id, siteId],
      );
      if (zoneResult.rows.length === 0) {
        throw new ValidationError("Unknown site_zone_id for estimate site", {
          field: "line_items",
          code: "unknown_site_zone",
          id: row.id,
          site_zone_id: row.site_zone_id,
        });
      }
    }
  }

  return normalized;
};

export const replaceEstimateLineItemsTx = async (
  client: PoolClient,
  estimateId: string,
  siteId: string,
  rows: EstimateLineItemPatchRow[],
  validScopeIds: Set<string>,
  checkedZones: CheckedZoneMembership,
): Promise<void> => {
  const normalized = await validateLineItems(
    client,
    siteId,
    rows,
    validScopeIds,
    checkedZones,
  );

  await client.query(`DELETE FROM estimate_line WHERE estimate_id = $1`, [
    estimateId,
  ]);

  for (const [index, row] of normalized.entries()) {
    const lineNumber = index + 1;
    const sortOrder = index + 1;

    await client.query(
      `INSERT INTO estimate_line (
         id,
         estimate_id,
         estimate_scope_id,
         site_zone_id,
         parent_line_id,
         line_number,
         line_role,
         line_kind,
         description,
         quantity,
         unit,
         unit_cost,
         unit_price,
         material_status,
         phase_id,
         item_id,
         part_id,
         vendor_part_id,
         sort_order
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        row.id,
        estimateId,
        row.estimate_scope_id ?? null,
        row.site_zone_id ?? null,
        row.parent_line_id ?? null,
        lineNumber,
        row.line_role,
        row.line_kind,
        row.description,
        row.quantity,
        row.unit,
        row.unit_cost,
        row.unit_price,
        row.material_status ?? null,
        row.phase_id ?? null,
        row.item_id ?? null,
        row.part_id ?? null,
        row.vendor_part_id ?? null,
        sortOrder,
      ],
    );
  }
};

export const replaceEstimateLineItems = async (
  pool: Pool,
  actorId: string,
  estimateId: string,
  siteId: string,
  rows: EstimateLineItemPatchRow[],
  validScopeIds: Set<string>,
  checkedZones: CheckedZoneMembership,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceEstimateLineItemsTx(
      client,
      estimateId,
      siteId,
      rows,
      validScopeIds,
      checkedZones,
    );
  });
};
