import { ConflictError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

export type JobLineCostRevisionRow = {
  id: string;
  job_line_id: string;
  previous_unit_cost: number;
  new_unit_cost: number;
  reason: string;
  revised_by: string | null;
  revised_at: string;
};

export type ReviseJobLineCostInput = {
  job_line_id: string;
  new_unit_cost: number;
  reason: string;
};

const toNumber = (value: unknown): number => Number(value ?? 0);

/**
 * Insert a re-budget revision and update `job_line.unit_cost` in one transaction.
 * Requires a non-empty `reason` (task 45 C3).
 */
export const reviseJobLineCostTx = async (
  client: PoolClient,
  actorId: string,
  input: ReviseJobLineCostInput,
): Promise<JobLineCostRevisionRow> => {
  const reason = input.reason.trim();
  if (reason.length === 0) {
    throw new ValidationError("Re-budget requires a reason", {
      field: "reason",
      code: "missing_reason",
    });
  }

  if (!Number.isFinite(input.new_unit_cost)) {
    throw new ValidationError("Invalid new_unit_cost", {
      field: "new_unit_cost",
      code: "invalid_unit_cost",
    });
  }

  const line = await client.query<{
    id: string;
    unit_cost: string | number;
    status: string;
  }>(
    `SELECT id, unit_cost, status FROM job_line WHERE id = $1 FOR UPDATE`,
    [input.job_line_id],
  );

  const existing = line.rows[0];
  if (!existing) {
    throw new ValidationError("Unknown job_line_id", {
      field: "job_line_id",
      code: "unknown_job_line",
    });
  }

  if (existing.status !== "active") {
    throw new ConflictError("Cannot re-budget a non-active job line", {
      field: "job_line_id",
      code: "job_line_not_active",
      status: existing.status,
    });
  }

  const previous = toNumber(existing.unit_cost);
  const revisionId = crypto.randomUUID();

  await client.query(
    `INSERT INTO job_line_cost_revision (
       id, job_line_id, previous_unit_cost, new_unit_cost, reason, revised_by
     ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [revisionId, input.job_line_id, previous, input.new_unit_cost, reason, actorId],
  );

  await client.query(`UPDATE job_line SET unit_cost = $1 WHERE id = $2`, [
    input.new_unit_cost,
    input.job_line_id,
  ]);

  const inserted = await client.query<{
    id: string;
    job_line_id: string;
    previous_unit_cost: string | number;
    new_unit_cost: string | number;
    reason: string;
    revised_by: string | null;
    revised_at: Date;
  }>(
    `SELECT id, job_line_id, previous_unit_cost, new_unit_cost, reason, revised_by, revised_at
     FROM job_line_cost_revision WHERE id = $1`,
    [revisionId],
  );

  const row = inserted.rows[0]!;
  return {
    id: row.id,
    job_line_id: row.job_line_id,
    previous_unit_cost: toNumber(row.previous_unit_cost),
    new_unit_cost: toNumber(row.new_unit_cost),
    reason: row.reason,
    revised_by: row.revised_by,
    revised_at: row.revised_at.toISOString(),
  };
};

export const reviseJobLineCost = async (
  pool: Pool,
  actorId: string,
  input: ReviseJobLineCostInput,
): Promise<JobLineCostRevisionRow> =>
  withPermissionDb(pool, actorId, (client) =>
    reviseJobLineCostTx(client, actorId, input),
  );

/** History: original estimate cost → re-budget chain → current (latest = current unit_cost). */
export const loadJobLineCostRevisionHistory = async (
  pool: Pool | PoolClient,
  jobLineId: string,
): Promise<JobLineCostRevisionRow[]> => {
  const result = await pool.query<{
    id: string;
    job_line_id: string;
    previous_unit_cost: string | number;
    new_unit_cost: string | number;
    reason: string;
    revised_by: string | null;
    revised_at: Date;
  }>(
    `SELECT id, job_line_id, previous_unit_cost, new_unit_cost, reason, revised_by, revised_at
     FROM job_line_cost_revision
     WHERE job_line_id = $1
     ORDER BY revised_at ASC, id ASC`,
    [jobLineId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    job_line_id: row.job_line_id,
    previous_unit_cost: toNumber(row.previous_unit_cost),
    new_unit_cost: toNumber(row.new_unit_cost),
    reason: row.reason,
    revised_by: row.revised_by,
    revised_at: row.revised_at.toISOString(),
  }));
};
