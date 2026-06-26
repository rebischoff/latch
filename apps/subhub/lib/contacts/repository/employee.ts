import type { ListQuery, ListResult } from "@latch/dal";
import type { Pool } from "pg";

import { escapeLikePattern } from "../../sites/repository/sql-utils";
import type { EmployeeListRow } from "../descriptors/employee-list";

type EmployeeListQuery = ListQuery & {
  q?: string;
};

const buildEmployeeSearchClause = (
  query: EmployeeListQuery,
  params: unknown[],
): string => {
  const q = query.q?.trim();
  if (!q) {
    return "TRUE";
  }

  params.push(`%${escapeLikePattern(q)}%`);
  return `p.display_name ILIKE $${params.length}`;
};

export const loadEmployeeList = async (
  pool: Pool,
  query: EmployeeListQuery,
): Promise<ListResult<EmployeeListRow>> => {
  if (query.rowScope === "own" || query.rowScope === "scope") {
    return { rows: [], total: 0 };
  }

  const params: unknown[] = ["employee"];
  const searchClause = buildEmployeeSearchClause(query, params);

  const fromSql = `party p
    INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = $1
    INNER JOIN employee e ON e.party_id = p.id
    LEFT JOIN party_person pp ON pp.party_id = p.id`;

  const countResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM ${fromSql} WHERE ${searchClause}`,
    params,
  );
  const total = countResult.rows[0]?.total ?? 0;

  const listParams = [...params, query.limit, query.offset];
  const limitIdx = listParams.length - 1;
  const offsetIdx = listParams.length;

  const listResult = await pool.query<{
    display_name: string;
    id: string;
    latch_user_id: string | null;
  }>(
    `SELECT p.id, p.display_name, pp.latch_user_id
     FROM ${fromSql}
     WHERE ${searchClause}
     ORDER BY p.display_name, p.id
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    listParams,
  );

  return {
    rows: listResult.rows.map((row) => ({
      id: row.id,
      display_name: row.display_name,
      latch_user_id: row.latch_user_id,
    })),
    total,
  };
};
