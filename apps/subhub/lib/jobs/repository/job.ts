import type { Pool } from "pg";

import type { JobDetailRelated, JobDetailRow } from "../descriptors/job-detail";
import type { JobListRow } from "../descriptors/job-list";
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

  const listResult = await pool.query<JobListRow>(
    `SELECT
       j.id,
       j.title,
       s.name AS site_display_name
     FROM job j
     INNER JOIN site s ON s.id = j.site_id
     ORDER BY j.title ASC, j.id ASC
     LIMIT $1 OFFSET $2`,
    [query.limit, query.offset],
  );

  return {
    rows: listResult.rows,
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
       e.title AS estimate_display_title
     FROM job j
     INNER JOIN site s ON s.id = j.site_id
     LEFT JOIN estimate e ON e.id = j.estimate_id
     WHERE j.id = $1`,
    [id],
  );

  return result.rows[0];
};

export const loadJobDetailRelated = async (
  pool: Pool,
  jobId: string,
): Promise<JobDetailRelated> => ({
  line_items: await loadJobLineItems(pool, jobId),
  stakeholders: await loadJobStakeholders(pool, jobId),
});
