/**
 * Job zone issues — flat per-zone signal-only log (tasks 57 / 60, FI1–FI12).
 *
 * Lifecycle: open → resolved | cancelled (both terminal; no reopen).
 * Pending (never saved) may be discarded client-side; persisted rows are never
 * hard-deleted. Writes batch into whole-job Field Save via `applyJobFieldSave`.
 */

import { writeAudit } from "@latch/audit";
import { ConflictError, NotFoundError, ValidationError } from "@latch/contracts";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

import { tableExists } from "@/lib/sites/repository/sql-utils";

import { zoneKeyFor } from "./job-field-progress";

export type JobIssueStatus = "open" | "resolved" | "cancelled";

export type JobIssueRow = {
  description: string;
  id: string;
  reported_at: string;
  reported_by: string | null;
  resolution_note: string;
  resolved_at: string | null;
  resolved_by: string | null;
  /** null = General. */
  site_zone_id: string | null;
  status: JobIssueStatus;
};

/** Pending Field Save actions (ISS5 / FI3–FI5). */
export type JobFieldIssuePatch =
  | {
      description: string;
      op: "create";
      site_zone_id: string | null;
      temp_id: string;
    }
  | {
      description: string;
      id: string;
      op: "update";
    }
  | {
      id: string;
      op: "resolve";
      resolution_note: string;
    }
  | {
      id: string;
      op: "cancel";
      /** Optional (FI5); omitted or blank → stored as `''`. */
      resolution_note?: string;
    }
  | {
      id: string;
      /** Rejected server-side for persisted rows (FI3). */
      op: "delete";
    };

export type OpenIssueCountByZone = {
  count: number;
  site_zone_id: string | null;
  zone_key: string;
};

export type OpenIssueCountByJob = {
  count: number;
  job_id: string;
};

type IssueDbRow = {
  description: string;
  id: string;
  reported_at: Date | string;
  reported_by: string | null;
  resolution_note: string;
  resolved_at: Date | string | null;
  resolved_by: string | null;
  site_zone_id: string | null;
  status: string;
};

const toIso = (value: Date | string | null): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
};

const mapIssueRow = (row: IssueDbRow): JobIssueRow => ({
  id: row.id,
  site_zone_id: row.site_zone_id,
  description: row.description,
  status: row.status as JobIssueStatus,
  reported_by: row.reported_by,
  reported_at: toIso(row.reported_at) ?? new Date(0).toISOString(),
  resolved_by: row.resolved_by,
  resolved_at: toIso(row.resolved_at),
  resolution_note: row.resolution_note ?? "",
});

const auditIssue = async (args: {
  action: "insert" | "update";
  actorId: string;
  after: Record<string, unknown> | null;
  before: Record<string, unknown> | null;
  recordId: string;
}): Promise<void> => {
  await writeAudit({
    actorId: args.actorId,
    action: args.action,
    tableName: "job_issue",
    recordId: args.recordId,
    moduleId: "job_detail",
    fieldIds: ["field_issues"],
    before: args.before,
    after: args.after,
  });
};

export const listIssuesForJob = async (
  pool: Pool | PoolClient,
  jobId: string,
): Promise<JobIssueRow[]> => {
  if (!(await tableExists(pool, "job_issue"))) {
    return [];
  }

  const result = await pool.query<IssueDbRow>(
    `SELECT id, site_zone_id, description, status,
            reported_by, reported_at, resolved_by, resolved_at, resolution_note
     FROM job_issue
     WHERE job_id = $1
     ORDER BY
       CASE status WHEN 'open' THEN 0 ELSE 1 END,
       reported_at DESC`,
    [jobId],
  );
  return result.rows.map(mapIssueRow);
};

/** Open issues only — for Field badge / live report (ISS6). */
export const listOpenIssuesForJob = async (
  pool: Pool | PoolClient,
  jobId: string,
): Promise<JobIssueRow[]> => {
  const all = await listIssuesForJob(pool, jobId);
  return all.filter((row) => row.status === "open");
};

/** Live grouped count of open issues by zone (null = General) — ISS6. */
export const countOpenIssuesByZone = async (
  pool: Pool | PoolClient,
  jobId: string,
): Promise<OpenIssueCountByZone[]> => {
  if (!(await tableExists(pool, "job_issue"))) {
    return [];
  }

  const result = await pool.query<{
    count: string | number;
    site_zone_id: string | null;
  }>(
    `SELECT site_zone_id, COUNT(*)::int AS count
     FROM job_issue
     WHERE job_id = $1 AND status = 'open'
     GROUP BY site_zone_id`,
    [jobId],
  );

  return result.rows.map((row) => ({
    site_zone_id: row.site_zone_id,
    zone_key: zoneKeyFor(row.site_zone_id),
    count: Number(row.count),
  }));
};

/** Job-list-wide open-issue counts for a PM rollup (ISS6). */
export const countOpenIssuesByJob = async (
  pool: Pool | PoolClient,
  jobIds?: string[],
): Promise<OpenIssueCountByJob[]> => {
  if (!(await tableExists(pool, "job_issue"))) {
    return [];
  }

  if (jobIds !== undefined && jobIds.length === 0) {
    return [];
  }

  const result =
    jobIds === undefined
      ? await pool.query<{ count: string | number; job_id: string }>(
          `SELECT job_id, COUNT(*)::int AS count
           FROM job_issue
           WHERE status = 'open'
           GROUP BY job_id`,
        )
      : await pool.query<{ count: string | number; job_id: string }>(
          `SELECT job_id, COUNT(*)::int AS count
           FROM job_issue
           WHERE status = 'open' AND job_id = ANY($1::text[])
           GROUP BY job_id`,
          [jobIds],
        );

  return result.rows.map((row) => ({
    job_id: row.job_id,
    count: Number(row.count),
  }));
};

export const createIssueTx = async (
  client: PoolClient,
  args: {
    actorId: string;
    description: string;
    jobId: string;
    reportedBy: string | null;
    siteZoneId: string | null;
  },
): Promise<JobIssueRow> => {
  const description = args.description.trim();
  if (!description) {
    throw new ValidationError("Issue description is required", {
      field: "field_issues",
      code: "missing_description",
    });
  }

  const id = randomUUID();
  const result = await client.query<IssueDbRow>(
    `INSERT INTO job_issue (
       id, job_id, site_zone_id, description, status, reported_by
     ) VALUES ($1, $2, $3, $4, 'open', $5)
     RETURNING id, site_zone_id, description, status,
               reported_by, reported_at, resolved_by, resolved_at, resolution_note`,
    [id, args.jobId, args.siteZoneId, description, args.reportedBy],
  );
  const row = mapIssueRow(result.rows[0]!);

  await auditIssue({
    actorId: args.actorId,
    action: "insert",
    recordId: row.id,
    before: null,
    after: {
      id: row.id,
      job_id: args.jobId,
      site_zone_id: row.site_zone_id,
      description: row.description,
      status: row.status,
      reported_by: row.reported_by,
      reported_at: row.reported_at,
    },
  });

  return row;
};

export const updateIssueDescriptionTx = async (
  client: PoolClient,
  args: {
    actorId: string;
    description: string;
    issueId: string;
  },
): Promise<JobIssueRow> => {
  const description = args.description.trim();
  if (!description) {
    throw new ValidationError("Issue description is required", {
      field: "field_issues",
      code: "missing_description",
      id: args.issueId,
    });
  }

  const prior = await client.query<IssueDbRow>(
    `SELECT id, site_zone_id, description, status,
            reported_by, reported_at, resolved_by, resolved_at, resolution_note
     FROM job_issue WHERE id = $1`,
    [args.issueId],
  );
  if (prior.rows.length === 0) {
    throw new NotFoundError("Issue not found");
  }
  const before = mapIssueRow(prior.rows[0]!);
  if (before.status !== "open") {
    throw new ConflictError("Issue description is locked after resolve/cancel", {
      field: "field_issues",
      code: "issue_description_locked",
      id: args.issueId,
      status: before.status,
    });
  }

  if (before.description === description) {
    return before;
  }

  const result = await client.query<IssueDbRow>(
    `UPDATE job_issue
     SET description = $2
     WHERE id = $1
     RETURNING id, site_zone_id, description, status,
               reported_by, reported_at, resolved_by, resolved_at, resolution_note`,
    [args.issueId, description],
  );
  const after = mapIssueRow(result.rows[0]!);

  await auditIssue({
    actorId: args.actorId,
    action: "update",
    recordId: after.id,
    before: { description: before.description },
    after: { description: after.description },
  });

  return after;
};

export const resolveIssueTx = async (
  client: PoolClient,
  args: {
    actorId: string;
    issueId: string;
    resolutionNote: string;
    resolvedBy: string | null;
  },
): Promise<JobIssueRow> => {
  const note = args.resolutionNote.trim();
  if (!note) {
    throw new ValidationError("Resolution note is required", {
      field: "field_issues",
      code: "missing_resolution_note",
      id: args.issueId,
    });
  }

  const prior = await client.query<IssueDbRow>(
    `SELECT id, site_zone_id, description, status,
            reported_by, reported_at, resolved_by, resolved_at, resolution_note
     FROM job_issue WHERE id = $1`,
    [args.issueId],
  );
  if (prior.rows.length === 0) {
    throw new NotFoundError("Issue not found");
  }
  const before = mapIssueRow(prior.rows[0]!);
  if (before.status !== "open") {
    throw new ConflictError("Issue is already terminal", {
      field: "field_issues",
      code: "issue_terminal",
      id: args.issueId,
      status: before.status,
    });
  }

  const result = await client.query<IssueDbRow>(
    `UPDATE job_issue
     SET status = 'resolved',
         resolution_note = $2,
         resolved_by = $3,
         resolved_at = now()
     WHERE id = $1
     RETURNING id, site_zone_id, description, status,
               reported_by, reported_at, resolved_by, resolved_at, resolution_note`,
    [args.issueId, note, args.resolvedBy],
  );
  const after = mapIssueRow(result.rows[0]!);

  await auditIssue({
    actorId: args.actorId,
    action: "update",
    recordId: after.id,
    before: { status: before.status, resolution_note: before.resolution_note },
    after: {
      status: after.status,
      resolution_note: after.resolution_note,
      resolved_by: after.resolved_by,
      resolved_at: after.resolved_at,
    },
  });

  return after;
};

export const cancelIssueTx = async (
  client: PoolClient,
  args: {
    actorId: string;
    issueId: string;
    /** Optional (FI5); blank → `''`. */
    resolutionNote?: string;
    resolvedBy: string | null;
  },
): Promise<JobIssueRow> => {
  const note = (args.resolutionNote ?? "").trim();

  const prior = await client.query<IssueDbRow>(
    `SELECT id, site_zone_id, description, status,
            reported_by, reported_at, resolved_by, resolved_at, resolution_note
     FROM job_issue WHERE id = $1`,
    [args.issueId],
  );
  if (prior.rows.length === 0) {
    throw new NotFoundError("Issue not found");
  }
  const before = mapIssueRow(prior.rows[0]!);
  if (before.status !== "open") {
    throw new ConflictError("Issue is already terminal", {
      field: "field_issues",
      code: "issue_terminal",
      id: args.issueId,
      status: before.status,
    });
  }

  const result = await client.query<IssueDbRow>(
    `UPDATE job_issue
     SET status = 'cancelled',
         resolution_note = $2,
         resolved_by = $3,
         resolved_at = now()
     WHERE id = $1
     RETURNING id, site_zone_id, description, status,
               reported_by, reported_at, resolved_by, resolved_at, resolution_note`,
    [args.issueId, note, args.resolvedBy],
  );
  const after = mapIssueRow(result.rows[0]!);

  await auditIssue({
    actorId: args.actorId,
    action: "update",
    recordId: after.id,
    before: {
      status: before.status,
      resolution_note: before.resolution_note,
    },
    after: {
      status: after.status,
      resolution_note: after.resolution_note,
      resolved_by: after.resolved_by,
      resolved_at: after.resolved_at,
    },
  });

  return after;
};

/**
 * Apply pending Field issue actions in the Field Save transaction (ISS5 / FI3–FI5).
 * Order: create → update → resolve/cancel. Delete of persisted rows is rejected.
 */
export const applyFieldIssuesTx = async (
  client: PoolClient,
  args: {
    actorId: string;
    employeeId: string | null;
    jobId: string;
    patches: JobFieldIssuePatch[];
  },
): Promise<{
  cancelled: number;
  created: number;
  resolved: number;
  updated: number;
}> => {
  if (args.patches.length === 0) {
    return { created: 0, updated: 0, resolved: 0, cancelled: 0 };
  }

  if (!(await tableExists(client, "job_issue"))) {
    throw new ValidationError("Job issues are not available", {
      field: "field_issues",
      code: "table_missing",
    });
  }

  let created = 0;
  let updated = 0;
  let resolved = 0;
  let cancelled = 0;

  const creates = args.patches.filter(
    (p): p is Extract<JobFieldIssuePatch, { op: "create" }> => p.op === "create",
  );
  const updates = args.patches.filter(
    (p): p is Extract<JobFieldIssuePatch, { op: "update" }> => p.op === "update",
  );
  const resolves = args.patches.filter(
    (p): p is Extract<JobFieldIssuePatch, { op: "resolve" }> => p.op === "resolve",
  );
  const cancels = args.patches.filter(
    (p): p is Extract<JobFieldIssuePatch, { op: "cancel" }> => p.op === "cancel",
  );
  const deletes = args.patches.filter(
    (p): p is Extract<JobFieldIssuePatch, { op: "delete" }> => p.op === "delete",
  );

  for (const patch of deletes) {
    throw new ValidationError("Persisted issues cannot be deleted", {
      field: "field_issues",
      code: "issue_delete_forbidden",
      id: patch.id,
    });
  }

  for (const patch of creates) {
    await createIssueTx(client, {
      actorId: args.actorId,
      jobId: args.jobId,
      siteZoneId: patch.site_zone_id,
      description: patch.description,
      reportedBy: args.employeeId,
    });
    created += 1;
  }

  for (const patch of updates) {
    await updateIssueDescriptionTx(client, {
      actorId: args.actorId,
      issueId: patch.id,
      description: patch.description,
    });
    updated += 1;
  }

  for (const patch of resolves) {
    await resolveIssueTx(client, {
      actorId: args.actorId,
      issueId: patch.id,
      resolutionNote: patch.resolution_note,
      resolvedBy: args.employeeId,
    });
    resolved += 1;
  }

  for (const patch of cancels) {
    await cancelIssueTx(client, {
      actorId: args.actorId,
      issueId: patch.id,
      resolutionNote: patch.resolution_note,
      resolvedBy: args.employeeId,
    });
    cancelled += 1;
  }

  return { created, updated, resolved, cancelled };
};
