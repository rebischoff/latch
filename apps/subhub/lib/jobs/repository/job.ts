import type { Pool } from "pg";

import type { JobDetailRelated, JobDetailRow } from "../descriptors/job-detail";
import type { JobListRow } from "../descriptors/job-list";
import { loadJobConditions } from "./job-conditions";
import { loadJobCostSummary } from "./job-cost-summary";
import {
  loadJobFieldProgress,
  loadJobFieldProgressSummaries,
} from "./job-field-progress-load";
import { loadJobLineItems } from "./job-lines";
import { loadJobStakeholders } from "./job-stakeholders";

export type JobListQuery = {
  limit: number;
  offset: number;
  rowScope?: "all" | "own" | "scope";
};

export const loadJobList = async (
  pool: Pool,
  query: JobListQuery,
): Promise<{ rows: JobListRow[]; total: number }> => {
  if (query.rowScope === "own" || query.rowScope === "scope") {
    return { rows: [], total: 0 };
  }

  const countResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM job`,
  );

  const listResult = await pool.query<{
    id: string;
    site_display_name: string;
    status: string;
    title: string;
  }>(
    `SELECT
       j.id,
       j.title,
       j.status,
       s.name AS site_display_name
     FROM job j
     INNER JOIN site s ON s.id = j.site_id
     ORDER BY j.title ASC, j.id ASC
     LIMIT $1 OFFSET $2`,
    [query.limit, query.offset],
  );

  const summaries = await loadJobFieldProgressSummaries(
    pool,
    listResult.rows.map((row) => row.id),
  );

  const rows: JobListRow[] = listResult.rows.map((row) => {
    const summary = summaries.get(row.id);
    return {
      id: row.id,
      title: row.title,
      site_display_name: row.site_display_name,
      status: row.status,
      lifecycle: summary?.lifecycle ?? (row.status === "cancelled" ? "cancelled" : "not_started"),
      progress_pct: summary?.progress_pct ?? 0,
      stale: summary?.stale ?? false,
    };
  });

  return {
    rows,
    total: countResult.rows[0]?.total ?? 0,
  };
};

export const loadJobDetail = async (
  pool: Pool,
  id: string,
): Promise<JobDetailRow | undefined> => {
  const result = await pool.query<JobDetailRow>(
    `SELECT
       j.id,
       j.title,
       j.site_id,
       s.name AS site_display_name,
       j.job_kind,
       j.status,
       j.estimate_id,
       e.title AS estimate_display_title,
       j.catalog_scope_item_id,
       i.name AS catalog_scope_display_name
     FROM job j
     INNER JOIN site s ON s.id = j.site_id
     LEFT JOIN estimate e ON e.id = j.estimate_id
     LEFT JOIN item i ON i.id = j.catalog_scope_item_id
     WHERE j.id = $1`,
    [id],
  );

  return result.rows[0];
};

export const loadJobDetailRelated = async (
  pool: Pool,
  jobId: string,
): Promise<JobDetailRelated> => ({
  cost_summary: await loadJobCostSummary(pool, jobId),
  conditions: await loadJobConditions(pool, jobId),
  field_progress: await loadJobFieldProgress(pool, jobId),
  line_items: await loadJobLineItems(pool, jobId),
  stakeholders: await loadJobStakeholders(pool, jobId),
});
