/**
 * Replace-array write for `job_field_order_cell` (task 62).
 * Same batching pattern as `job_field_progress_cell`. Task 63: sync open
 * `job_material_request` rows to the live derived pool after Order cells persist.
 */

import { ConflictError, ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

import { syncOpenJobMaterialRequestsForJob } from "@/lib/requested-orders/repository/job-material-request-derive";
import { tableExists } from "@/lib/sites/repository/sql-utils";

import {
  buildOrderRows,
  resolveLineMaterialScopePhaseId,
  type JobFieldOrderCellPatch,
  type OrderEligibilityLine,
} from "./job-field-order";
import { zoneKeyFor } from "./job-field-progress";

const cellKey = (scopePhaseId: string, siteZoneId: string | null): string =>
  `${scopePhaseId}:${zoneKeyFor(siteZoneId)}`;

const loadOrderEligibilityLinesTx = async (
  client: PoolClient,
  jobId: string,
): Promise<OrderEligibilityLine[]> => {
  const linesResult = await client.query<{
    id: string;
    item_id: string | null;
    material_locked: boolean;
    material_phase_id: string | null;
    quantity: number;
  }>(
    `SELECT
       jl.id,
       jl.quantity,
       jl.material_locked,
       jl.material_phase_id,
       jl.item_id
     FROM job_line jl
     WHERE jl.job_id = $1 AND jl.status = 'active'`,
    [jobId],
  );

  if (linesResult.rows.length === 0) {
    return [];
  }

  const lineIds = linesResult.rows.map((row) => row.id);
  const itemIds = [
    ...new Set(
      linesResult.rows
        .map((row) => row.item_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const bomResult = await client.query<{ job_line_id: string }>(
    `SELECT DISTINCT job_line_id
     FROM job_line_part
     WHERE job_line_id = ANY($1::text[])`,
    [lineIds],
  );
  const bomLineIds = new Set(bomResult.rows.map((row) => row.job_line_id));

  const phasesResult = await client.query<{
    id: string;
    job_line_id: string;
    labor_phase_id: string | null;
    sequence: number;
  }>(
    `SELECT id, job_line_id, labor_phase_id, sequence
     FROM scope_phase
     WHERE job_line_id = ANY($1::text[])`,
    [lineIds],
  );
  const phasesByLine = new Map<string, typeof phasesResult.rows>();
  for (const row of phasesResult.rows) {
    const list = phasesByLine.get(row.job_line_id) ?? [];
    list.push(row);
    phasesByLine.set(row.job_line_id, list);
  }

  const allocResult = await client.query<{
    job_line_id: string;
    quantity: number;
    site_zone_id: string;
  }>(
    `SELECT job_line_id, site_zone_id, quantity
     FROM job_line_allocation
     WHERE job_line_id = ANY($1::text[])`,
    [lineIds],
  );
  const allocsByLine = new Map<string, typeof allocResult.rows>();
  for (const row of allocResult.rows) {
    const list = allocsByLine.get(row.job_line_id) ?? [];
    list.push(row);
    allocsByLine.set(row.job_line_id, list);
  }

  const itemMaterialById = new Map<string, string | null>();
  const itemParentById = new Map<string, string | null>();
  if (itemIds.length > 0) {
    const itemResult = await client.query<{
      id: string;
      material_phase_id: string | null;
      parent_id: string | null;
    }>(
      `WITH RECURSIVE chain AS (
         SELECT id, parent_id, material_phase_id
         FROM item
         WHERE id = ANY($1::text[])
         UNION ALL
         SELECT i.id, i.parent_id, i.material_phase_id
         FROM item i
         INNER JOIN chain c ON i.id = c.parent_id
       )
       SELECT DISTINCT id, parent_id, material_phase_id FROM chain`,
      [itemIds],
    );
    for (const row of itemResult.rows) {
      itemMaterialById.set(row.id, row.material_phase_id);
      itemParentById.set(row.id, row.parent_id);
    }
  }

  const ancestryForItem = (itemId: string | null): Array<string | null> => {
    if (!itemId) {
      return [];
    }
    const chain: Array<string | null> = [];
    let current: string | null = itemId;
    const guard = new Set<string>();
    while (current && !guard.has(current)) {
      guard.add(current);
      chain.push(itemMaterialById.get(current) ?? null);
      current = itemParentById.get(current) ?? null;
    }
    return chain;
  };

  return linesResult.rows.map((row) => ({
    id: row.id,
    quantity: Number(row.quantity),
    material_locked: Boolean(row.material_locked),
    lineMaterialPhaseId: row.material_phase_id,
    ancestryMaterialPhaseIds: ancestryForItem(row.item_id),
    has_bom: bomLineIds.has(row.id),
    scopePhases: (phasesByLine.get(row.id) ?? []).map((p) => ({
      id: p.id,
      labor_phase_id: p.labor_phase_id,
      sequence: Number(p.sequence),
    })),
    allocations: (allocsByLine.get(row.id) ?? []).map((a) => ({
      site_zone_id: a.site_zone_id,
      quantity: Number(a.quantity),
    })),
  }));
};

/**
 * Replace-array semantics for Field Order cells.
 * Persists cells for BOM lines (locked and unlocked). Pool eligibility
 * (locked-only) is enforced on read/derive in task 63.
 */
export const replaceJobFieldOrderTx = async (
  client: PoolClient,
  jobId: string,
  cells: JobFieldOrderCellPatch[],
): Promise<void> => {
  const jobResult = await client.query<{ status: string }>(
    `SELECT status FROM job WHERE id = $1`,
    [jobId],
  );
  const job = jobResult.rows[0];
  if (!job) {
    throw new ValidationError("Job not found", {
      field: "field_zone_orders",
      code: "unknown_job",
    });
  }

  if (job.status === "cancelled") {
    throw new ConflictError("Cannot modify field order on a cancelled job", {
      field: "field_zone_orders",
      code: "job_cancelled",
    });
  }

  if (!(await tableExists(client, "job_field_order_cell"))) {
    throw new ValidationError("Field order is not available", {
      field: "field_zone_orders",
      code: "table_missing",
    });
  }

  const eligibility = await loadOrderEligibilityLinesTx(client, jobId);
  const orderRows = buildOrderRows(eligibility);

  // BOM lines (locked and unlocked) are checkable; pool eligibility is locked-only (63).
  const allowedKeys = new Set(
    orderRows.map((row) =>
      cellKey(
        row.scope_phase_id,
        row.zone_key === "general" ? null : row.zone_key,
      ),
    ),
  );

  const phaseIds = new Set(
    eligibility.flatMap((line) => line.scopePhases.map((p) => p.id)),
  );

  const seen = new Set<string>();
  for (const [index, cell] of cells.entries()) {
    if (!phaseIds.has(cell.scope_phase_id)) {
      throw new ValidationError("Unknown scope_phase_id in field_zone_orders", {
        field: "field_zone_orders",
        code: "unknown_scope_phase",
        index,
        scope_phase_id: cell.scope_phase_id,
      });
    }
    const key = cellKey(cell.scope_phase_id, cell.site_zone_id);
    if (!allowedKeys.has(key)) {
      throw new ValidationError(
        "field_zone_orders cell does not match an orderable geography slice",
        {
          field: "field_zone_orders",
          code: "unknown_slice",
          index,
          scope_phase_id: cell.scope_phase_id,
          site_zone_id: cell.site_zone_id,
        },
      );
    }
    if (seen.has(key)) {
      throw new ValidationError("Duplicate field_zone_orders cell", {
        field: "field_zone_orders",
        code: "duplicate_cell",
        index,
        scope_phase_id: cell.scope_phase_id,
        site_zone_id: cell.site_zone_id,
      });
    }
    seen.add(key);
  }

  if (phaseIds.size > 0) {
    await client.query(
      `DELETE FROM job_field_order_cell
       WHERE scope_phase_id = ANY($1::text[])`,
      [[...phaseIds]],
    );
  }

  for (const cell of cells) {
    await client.query(
      `INSERT INTO job_field_order_cell (
         scope_phase_id, site_zone_id, requested, updated_at
       ) VALUES ($1, $2, $3, now())`,
      [cell.scope_phase_id, cell.site_zone_id, cell.requested],
    );
  }

  // RP1: Order cells are persistent state — refresh open pool rows immediately.
  await syncOpenJobMaterialRequestsForJob(client, jobId);
};

/** Exported for unit tests — material scope resolution on eligibility lines. */
export const materialScopePhaseIdsForLines = (
  lines: OrderEligibilityLine[],
): Map<string, string | null> => {
  const map = new Map<string, string | null>();
  for (const line of lines) {
    map.set(
      line.id,
      resolveLineMaterialScopePhaseId({
        lineMaterialPhaseId: line.lineMaterialPhaseId,
        ancestryMaterialPhaseIds: line.ancestryMaterialPhaseIds,
        scopePhases: line.scopePhases,
      }),
    );
  }
  return map;
};
