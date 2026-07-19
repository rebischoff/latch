import type { Pool } from "pg";

import type { JobMaterialRequestListRow } from "../descriptors/job-material-request-list";

export type JobMaterialRequestListQuery = {
  limit: number;
  offset: number;
  job_id?: string;
  status?: string;
  site_zone_id?: string;
  rowScope?: "all" | "own" | "scope";
};

export const loadJobMaterialRequestList = async (
  pool: Pool,
  query: JobMaterialRequestListQuery,
): Promise<{ rows: JobMaterialRequestListRow[]; total: number }> => {
  if (query.rowScope === "own" || query.rowScope === "scope") {
    return { rows: [], total: 0 };
  }

  const params: unknown[] = [];
  const clauses: string[] = ["TRUE"];

  if (query.job_id) {
    params.push(query.job_id);
    clauses.push(`jmr.job_id = $${params.length}`);
  }
  if (query.status) {
    params.push(query.status);
    clauses.push(`jmr.status = $${params.length}`);
  }
  if (query.site_zone_id !== undefined) {
    if (query.site_zone_id === "" || query.site_zone_id === "general") {
      clauses.push(`jmr.site_zone_id IS NULL`);
    } else {
      params.push(query.site_zone_id);
      clauses.push(`jmr.site_zone_id = $${params.length}`);
    }
  }

  const whereSql = clauses.join(" AND ");

  const countResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM job_material_request jmr WHERE ${whereSql}`,
    params,
  );

  const listParams = [...params, query.limit, query.offset];
  const limitIdx = listParams.length - 1;
  const offsetIdx = listParams.length;

  const listResult = await pool.query<{
    id: string;
    job_id: string;
    job_title: string;
    site_zone_id: string | null;
    site_zone_name: string | null;
    job_line_part_id: string | null;
    part_id: string | null;
    part_mpn: string | null;
    description: string;
    quantity: string | number;
    unit: string;
    status: string;
    requested_at: string;
    requested_by_display_name: string | null;
  }>(
    `SELECT
       jmr.id,
       jmr.job_id,
       j.title AS job_title,
       jmr.site_zone_id,
       sz.name AS site_zone_name,
       jmr.job_line_part_id,
       jmr.part_id,
       mp.mpn AS part_mpn,
       jmr.description,
       jmr.quantity,
       jmr.unit,
       jmr.status,
       jmr.requested_at,
       p.display_name AS requested_by_display_name
     FROM job_material_request jmr
     INNER JOIN job j ON j.id = jmr.job_id
     LEFT JOIN site_zone sz ON sz.id = jmr.site_zone_id
     LEFT JOIN manufacturer_part mp ON mp.id = jmr.part_id
     LEFT JOIN party p ON p.id = jmr.requested_by
     WHERE ${whereSql}
     ORDER BY jmr.requested_at DESC, jmr.id ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    listParams,
  );

  return {
    rows: listResult.rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity ?? 0),
    })),
    total: countResult.rows[0]?.total ?? 0,
  };
};

export const loadJobMaterialRequestById = async (
  pool: Pool,
  id: string,
): Promise<JobMaterialRequestListRow | undefined> => {
  const rowResult = await pool.query<{
    id: string;
    job_id: string;
    job_title: string;
    site_zone_id: string | null;
    site_zone_name: string | null;
    job_line_part_id: string | null;
    part_id: string | null;
    part_mpn: string | null;
    description: string;
    quantity: string | number;
    unit: string;
    status: string;
    requested_at: string;
    requested_by_display_name: string | null;
  }>(
    `SELECT
       jmr.id,
       jmr.job_id,
       j.title AS job_title,
       jmr.site_zone_id,
       sz.name AS site_zone_name,
       jmr.job_line_part_id,
       jmr.part_id,
       mp.mpn AS part_mpn,
       jmr.description,
       jmr.quantity,
       jmr.unit,
       jmr.status,
       jmr.requested_at,
       p.display_name AS requested_by_display_name
     FROM job_material_request jmr
     INNER JOIN job j ON j.id = jmr.job_id
     LEFT JOIN site_zone sz ON sz.id = jmr.site_zone_id
     LEFT JOIN manufacturer_part mp ON mp.id = jmr.part_id
     LEFT JOIN party p ON p.id = jmr.requested_by
     WHERE jmr.id = $1`,
    [id],
  );

  const row = rowResult.rows[0];
  if (!row) {
    return undefined;
  }
  return { ...row, quantity: Number(row.quantity ?? 0) };
};
