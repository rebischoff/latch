import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { tableExists } from "@/lib/sites/repository/sql-utils";

import {
  computeFieldProgressPct,
  zoneKeyFor,
  type JobFieldProgressCellPatch,
} from "./job-field-progress";

const cellFingerprint = (cell: JobFieldProgressCellPatch): string =>
  `${cell.scope_phase_id}:${zoneKeyFor(cell.site_zone_id)}:${cell.complete ? "1" : "0"}`;

/** `(scope_phase_id, site_zone_id)` → hours, keyed the same way as the living board. */
export type ReportCellWeightMap = Map<string, number>;

export const reportCellWeightKey = (
  scopePhaseId: string,
  siteZoneId: string | null,
): string => `${scopePhaseId}:${zoneKeyFor(siteZoneId)}`;

export type JobProgressReportCellWeight = {
  complete: boolean;
  weight_hours: number;
};

/**
 * Hours-weighted % for a stored report (planning/21 PR1) — same formula as the living
 * board (F8), but over **frozen** `weight_hours` so a later scope_phase hours change
 * (re-budget / CO revise) does not retroactively move a historical report's %.
 */
export const computeReportProgressPct = (
  cells: JobProgressReportCellWeight[],
): number =>
  computeFieldProgressPct(
    cells.map((cell) => ({ hours: cell.weight_hours, complete: cell.complete })),
  );

/**
 * True when the replace-array differs from the prior living board (order-independent).
 */
export const fieldProgressCellsChanged = (
  prior: JobFieldProgressCellPatch[],
  next: JobFieldProgressCellPatch[],
): boolean => {
  if (prior.length !== next.length) {
    return true;
  }
  const a = prior.map(cellFingerprint).sort();
  const b = next.map(cellFingerprint).sort();
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return true;
    }
  }
  return false;
};

/**
 * Append a full-board progress report when cells changed (task 55 Step 2).
 * No-op when unchanged or when report tables are absent.
 */
export const appendJobProgressReportIfChangedTx = async (
  client: PoolClient,
  args: {
    jobId: string;
    priorCells: JobFieldProgressCellPatch[];
    nextCells: JobFieldProgressCellPatch[];
    recordedBy: string | null;
    /** Hours weight per cell at snapshot time (PR1) — 0 when not resolvable. */
    weightByCellKey?: ReportCellWeightMap;
  },
): Promise<{ reportId: string } | null> => {
  if (!fieldProgressCellsChanged(args.priorCells, args.nextCells)) {
    return null;
  }

  if (!(await tableExists(client, "job_progress_report"))) {
    return null;
  }

  const reportId = randomUUID();
  await client.query(
    `INSERT INTO job_progress_report (id, job_id, recorded_at, recorded_by)
     VALUES ($1, $2, now(), $3)`,
    [reportId, args.jobId, args.recordedBy],
  );

  for (const cell of args.nextCells) {
    const weightHours =
      args.weightByCellKey?.get(
        reportCellWeightKey(cell.scope_phase_id, cell.site_zone_id),
      ) ?? 0;
    await client.query(
      `INSERT INTO job_progress_report_cell (
         report_id, scope_phase_id, site_zone_id, complete, weight_hours
       ) VALUES ($1, $2, $3, $4, $5)`,
      [reportId, cell.scope_phase_id, cell.site_zone_id, cell.complete, weightHours],
    );
  }

  return { reportId };
};
