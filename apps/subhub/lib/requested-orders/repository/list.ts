import type { Pool } from "pg";

import type { RequestedOrderListRow } from "../descriptors/requested-order-list";

export type RequestedOrderListQuery = {
  limit: number;
  offset: number;
  job_id?: string;
  rowScope?: "all" | "own" | "scope";
};

export const loadRequestedOrderList = async (
  pool: Pool,
  query: RequestedOrderListQuery,
): Promise<{ rows: RequestedOrderListRow[]; total: number }> => {
  if (query.rowScope === "own" || query.rowScope === "scope") {
    return { rows: [], total: 0 };
  }

  const params: unknown[] = [];
  let whereSql = "TRUE";
  if (query.job_id) {
    params.push(query.job_id);
    whereSql = `ro.job_id = $${params.length}`;
  }

  const countResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM requested_order ro WHERE ${whereSql}`,
    params,
  );

  const listParams = [...params, query.limit, query.offset];
  const limitIdx = listParams.length - 1;
  const offsetIdx = listParams.length;

  const listResult = await pool.query<{
    id: string;
    job_id: string;
    job_title: string;
    requested_at: string;
    note: string;
    open_line_count: number;
  }>(
    `SELECT
       ro.id,
       ro.job_id,
       j.title AS job_title,
       ro.requested_at,
       ro.note,
       COALESCE(lc.open_line_count, 0)::int AS open_line_count
     FROM requested_order ro
     INNER JOIN job j ON j.id = ro.job_id
     LEFT JOIN (
       SELECT requested_order_id, COUNT(*)::int AS open_line_count
       FROM requested_order_line
       WHERE status = 'open'
       GROUP BY requested_order_id
     ) lc ON lc.requested_order_id = ro.id
     WHERE ${whereSql}
     ORDER BY ro.requested_at DESC, ro.id ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    listParams,
  );

  return {
    rows: listResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
};
