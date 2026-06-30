import type { Pool } from "pg";

import type { EstimateDetailRelated, EstimateDetailRow } from "../descriptors/estimate-detail";
import type { EstimateListRow } from "../descriptors/estimate-list";
import { escapeLikePattern } from "../../sites/repository/sql-utils";
import { loadEstimateLineItems } from "./estimate-lines";
import { loadEstimateStakeholders } from "./estimate-stakeholders";
import { loadEstimateSystems } from "./estimate-systems";

export type EstimateListQuery = {
  limit: number;
  offset: number;
  q?: string;
  rowScope?: "all" | "own" | "scope";
};

const buildEstimateListWhere = (
  query: EstimateListQuery,
  params: unknown[],
): string | null => {
  if (query.rowScope === "own" || query.rowScope === "scope") {
    return null;
  }

  const q = query.q?.trim();
  if (!q) {
    return "TRUE";
  }

  params.push(`%${escapeLikePattern(q)}%`);
  return `e.title ILIKE $${params.length} ESCAPE '\\'`;
};

export const loadEstimateList = async (
  pool: Pool,
  query: EstimateListQuery,
): Promise<{ rows: EstimateListRow[]; total: number }> => {
  const params: unknown[] = [];
  const whereSql = buildEstimateListWhere(query, params);
  if (!whereSql) {
    return { rows: [], total: 0 };
  }

  const countResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM estimate e
     WHERE ${whereSql}`,
    params,
  );

  const listParams = [...params, query.limit, query.offset];
  const limitIdx = listParams.length - 1;
  const offsetIdx = listParams.length;
  const listResult = await pool.query<EstimateListRow>(
    `SELECT
       e.id,
       e.title,
       e.status,
       e.estimate_date,
       s.name
     FROM estimate e
     INNER JOIN site s ON s.id = e.site_id
     WHERE ${whereSql}
     ORDER BY e.estimate_date DESC NULLS LAST, e.title ASC, e.id ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    listParams,
  );

  return {
    rows: listResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
};

export const loadEstimateDetail = async (
  pool: Pool,
  id: string,
): Promise<EstimateDetailRow | undefined> => {
  const result = await pool.query<EstimateDetailRow>(
    `SELECT
       e.id,
       e.title,
       e.site_id,
       s.name AS site_display_name,
       e.status,
       e.estimate_date,
       e.valid_until,
       e.source_estimate_id,
       e.category_id
     FROM estimate e
     INNER JOIN site s ON s.id = e.site_id
     WHERE e.id = $1`,
    [id],
  );

  return result.rows[0];
};

export const loadEstimateDetailRelated = async (
  pool: Pool,
  estimateId: string,
): Promise<EstimateDetailRelated> => ({
  stakeholders: await loadEstimateStakeholders(pool, estimateId),
  systems: await loadEstimateSystems(pool, estimateId),
  line_items: await loadEstimateLineItems(pool, estimateId),
});
