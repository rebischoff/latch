import { ConflictError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { resolveEmployeePartyIdForPrincipal } from "@/lib/requested-orders/repository/employee-resolve";
import { tableExists } from "@/lib/sites/repository/sql-utils";

import {
  zoneKeyFor,
  type JobFieldProgressCellPatch,
  type JobFieldZoneOrderPatch,
} from "./job-field-progress";
import {
  buildFieldProgressSlices,
  loadJobFieldProgress,
} from "./job-field-progress-load";
import { applyFieldZoneOrdersTx } from "./job-field-zone-order-write";
import {
  applyFieldIssuesTx,
  type JobFieldIssuePatch,
} from "./job-issue";
import {
  appendJobProgressReportIfChangedTx,
  reportCellWeightKey,
  type ReportCellWeightMap,
} from "./job-progress-report";

const cellKey = (scopePhaseId: string, siteZoneId: string | null): string =>
  `${scopePhaseId}:${zoneKeyFor(siteZoneId)}`;

const loadPriorCellsTx = async (
  client: PoolClient,
  phaseIds: string[],
): Promise<JobFieldProgressCellPatch[]> => {
  if (
    phaseIds.length === 0 ||
    !(await tableExists(client, "job_field_progress_cell"))
  ) {
    return [];
  }
  const result = await client.query<{
    complete: boolean;
    scope_phase_id: string;
    site_zone_id: string | null;
  }>(
    `SELECT scope_phase_id, site_zone_id, complete
     FROM job_field_progress_cell
     WHERE scope_phase_id = ANY($1::text[])`,
    [phaseIds],
  );
  return result.rows.map((row) => ({
    scope_phase_id: row.scope_phase_id,
    site_zone_id: row.site_zone_id,
    complete: Boolean(row.complete),
  }));
};

/**
 * Replace-array semantics for `field_progress`:
 * the PATCH array is the full set of cells to persist (complete true or false).
 * Any prior cell for this job's active scope phases that is omitted is deleted.
 * When progress changed, appends a full-board `job_progress_report*` (task 55).
 * Does **not** write `progress_entry*`.
 */
export const replaceJobFieldProgressTx = async (
  client: PoolClient,
  jobId: string,
  cells: JobFieldProgressCellPatch[],
  options?: { recordedBy?: string | null },
): Promise<void> => {
  const jobResult = await client.query<{ status: string }>(
    `SELECT status FROM job WHERE id = $1`,
    [jobId],
  );
  const job = jobResult.rows[0];
  if (!job) {
    throw new ValidationError("Job not found", {
      field: "field_progress",
      code: "unknown_job",
    });
  }

  if (job.status === "cancelled") {
    throw new ConflictError("Cannot modify field progress on a cancelled job", {
      field: "field_progress",
      code: "job_cancelled",
    });
  }

  if (!(await tableExists(client, "job_field_progress_cell"))) {
    throw new ValidationError("Field progress is not available", {
      field: "field_progress",
      code: "table_missing",
    });
  }

  const phasesResult = await client.query<{
    hours_per_unit: number;
    id: string;
    job_line_id: string;
    labor_phase_id: string | null;
  }>(
    `SELECT
       sp.id,
       sp.job_line_id,
       sp.labor_phase_id,
       sp.progress_weight AS hours_per_unit
     FROM scope_phase sp
     INNER JOIN job_line jl ON jl.id = sp.job_line_id
     WHERE jl.job_id = $1
       AND jl.status = 'active'`,
    [jobId],
  );

  if (phasesResult.rows.length === 0) {
    if (cells.length > 0) {
      throw new ValidationError("Job has no scope phases for field progress", {
        field: "field_progress",
        code: "no_scope_phases",
      });
    }
    await client.query(
      `UPDATE job SET field_progress_updated_at = now(), updated_at = now() WHERE id = $1`,
      [jobId],
    );
    return;
  }

  const phaseIds = new Set(phasesResult.rows.map((row) => row.id));
  const priorCells = await loadPriorCellsTx(client, [...phaseIds]);

  const linesResult = await client.query<{
    description: string;
    id: string;
    item_name: string | null;
    part_id: string | null;
    part_mpn: string | null;
    quantity: number;
  }>(
    `SELECT
       jl.id,
       jl.description,
       jl.quantity,
       NULL::text AS item_name,
       NULL::text AS part_id,
       NULL::text AS part_mpn
     FROM job_line jl
     WHERE jl.job_id = $1 AND jl.status = 'active'`,
    [jobId],
  );

  const allocResult = await client.query<{
    job_line_id: string;
    quantity: number;
    site_zone_id: string;
    site_zone_name: string | null;
  }>(
    `SELECT jla.job_line_id, jla.site_zone_id, jla.quantity, NULL::text AS site_zone_name
     FROM job_line_allocation jla
     INNER JOIN job_line jl ON jl.id = jla.job_line_id
     WHERE jl.job_id = $1 AND jl.status = 'active'`,
    [jobId],
  );

  const slices = buildFieldProgressSlices({
    lines: linesResult.rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
    })),
    allocations: allocResult.rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
    })),
    phases: phasesResult.rows.map((row) => ({
      id: row.id,
      job_line_id: row.job_line_id,
      labor_phase_id: row.labor_phase_id,
      name: "",
      sequence: 0,
      sort_order: 0,
      hours_per_unit: Number(row.hours_per_unit),
    })),
  });

  const allowed = new Set(
    slices.map((s) => cellKey(s.scope_phase_id, s.site_zone_id)),
  );

  const seen = new Set<string>();
  for (const [index, cell] of cells.entries()) {
    if (!phaseIds.has(cell.scope_phase_id)) {
      throw new ValidationError("Unknown scope_phase_id in field_progress", {
        field: "field_progress",
        code: "unknown_scope_phase",
        index,
        scope_phase_id: cell.scope_phase_id,
      });
    }
    const key = cellKey(cell.scope_phase_id, cell.site_zone_id);
    if (!allowed.has(key)) {
      throw new ValidationError(
        "field_progress cell does not match an active geography slice",
        {
          field: "field_progress",
          code: "unknown_slice",
          index,
          scope_phase_id: cell.scope_phase_id,
          site_zone_id: cell.site_zone_id,
        },
      );
    }
    if (seen.has(key)) {
      throw new ValidationError("Duplicate field_progress cell", {
        field: "field_progress",
        code: "duplicate_cell",
        index,
        scope_phase_id: cell.scope_phase_id,
        site_zone_id: cell.site_zone_id,
      });
    }
    seen.add(key);
  }

  await client.query(
    `DELETE FROM job_field_progress_cell
     WHERE scope_phase_id = ANY($1::text[])`,
    [[...phaseIds]],
  );

  for (const cell of cells) {
    await client.query(
      `INSERT INTO job_field_progress_cell (
         scope_phase_id, site_zone_id, complete, updated_at
       ) VALUES ($1, $2, $3, now())`,
      [cell.scope_phase_id, cell.site_zone_id, cell.complete],
    );
  }

  const geoQtyBySlice = new Map<string, number>();
  for (const line of linesResult.rows) {
    const lineAllocs = allocResult.rows.filter((a) => a.job_line_id === line.id);
    let placed = 0;
    for (const alloc of lineAllocs) {
      placed += Number(alloc.quantity);
      for (const phase of phasesResult.rows.filter(
        (p) => p.job_line_id === line.id,
      )) {
        geoQtyBySlice.set(
          cellKey(phase.id, alloc.site_zone_id),
          Number(alloc.quantity),
        );
      }
    }
    const generalQty = Number(line.quantity) - placed;
    if (generalQty > 0) {
      for (const phase of phasesResult.rows.filter(
        (p) => p.job_line_id === line.id,
      )) {
        geoQtyBySlice.set(cellKey(phase.id, null), generalQty);
      }
    }
  }

  const completeByPhase = new Map<string, number>();
  for (const cell of cells) {
    if (!cell.complete) {
      continue;
    }
    const qty =
      geoQtyBySlice.get(cellKey(cell.scope_phase_id, cell.site_zone_id)) ?? 0;
    completeByPhase.set(
      cell.scope_phase_id,
      (completeByPhase.get(cell.scope_phase_id) ?? 0) + qty,
    );
  }

  for (const phaseId of phaseIds) {
    await client.query(
      `UPDATE scope_phase SET completed_qty = $2 WHERE id = $1`,
      [phaseId, completeByPhase.get(phaseId) ?? 0],
    );
  }

  const weightByCellKey: ReportCellWeightMap = new Map();
  for (const slice of slices) {
    const key = reportCellWeightKey(slice.scope_phase_id, slice.site_zone_id);
    weightByCellKey.set(key, (weightByCellKey.get(key) ?? 0) + Number(slice.hours));
  }

  await appendJobProgressReportIfChangedTx(client, {
    jobId,
    priorCells,
    nextCells: cells,
    recordedBy: options?.recordedBy ?? null,
    weightByCellKey,
  });

  await client.query(
    `UPDATE job SET field_progress_updated_at = now(), updated_at = now() WHERE id = $1`,
    [jobId],
  );
};

export const replaceJobFieldProgress = async (
  pool: Pool,
  actorId: string,
  jobId: string,
  cells: JobFieldProgressCellPatch[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    const recordedBy = await resolveEmployeePartyIdForPrincipal(client, actorId);
    await replaceJobFieldProgressTx(client, jobId, cells, { recordedBy });
  });
};

/**
 * Persist Field progress, zone Order, and issues in one transaction
 * (tasks 55 + 57 + 60 — Field-direct ad-hoc removed by FI2).
 */
export const applyJobFieldSave = async (
  pool: Pool,
  actorId: string,
  jobId: string,
  args: {
    cells?: JobFieldProgressCellPatch[];
    issues?: JobFieldIssuePatch[];
    zoneOrders?: JobFieldZoneOrderPatch[];
  },
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    const employeeId = await resolveEmployeePartyIdForPrincipal(client, actorId);

    if (args.cells !== undefined) {
      await replaceJobFieldProgressTx(client, jobId, args.cells, {
        recordedBy: employeeId,
      });
    }

    if (args.zoneOrders !== undefined && args.zoneOrders.length > 0) {
      await applyFieldZoneOrdersTx(client, {
        jobId,
        desired: args.zoneOrders,
        requestedBy: employeeId,
      });
    }

    if (args.issues !== undefined && args.issues.length > 0) {
      await applyFieldIssuesTx(client, {
        actorId,
        jobId,
        employeeId,
        patches: args.issues,
      });
    }
  });
};

/**
 * Cancel is allowed only when derived progress = 0% and job is not already cancelled.
 * Sets `job.status = cancelled` (stored lifecycle).
 */
export const assertJobCancelAllowed = async (
  pool: Pool | PoolClient,
  jobId: string,
): Promise<void> => {
  const jobResult = await pool.query<{
    field_progress_updated_at: Date | null;
    status: string;
  }>(
    `SELECT status, field_progress_updated_at FROM job WHERE id = $1`,
    [jobId],
  );
  const job = jobResult.rows[0];
  if (!job) {
    throw new ValidationError("Job not found", {
      field: "profile",
      code: "unknown_job",
    });
  }
  if (job.status === "cancelled") {
    throw new ConflictError("Job is already cancelled", {
      field: "profile",
      code: "already_cancelled",
    });
  }

  const dto = await loadJobFieldProgress(pool, jobId);
  if (dto.progress_pct > 0) {
    throw new ConflictError(
      "Cannot cancel a job with field progress greater than 0%",
      {
        field: "profile",
        code: "cancel_requires_zero_progress",
        progress_pct: dto.progress_pct,
      },
    );
  }
};

export const cancelJobIfAllowed = async (
  pool: Pool,
  actorId: string,
  jobId: string,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await assertJobCancelAllowed(client, jobId);
    await client.query(
      `UPDATE job SET status = 'cancelled', updated_at = now() WHERE id = $1`,
      [jobId],
    );
  });
};
