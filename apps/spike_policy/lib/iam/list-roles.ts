import type { Pool } from "pg";

import type { RoleClass } from "./memory-role-store.js";

export type RoleListItem = {
  id: string;
  displayName: string;
  roleClass: RoleClass;
  assignmentCount: number;
};

export const listRolesFromPg = async (pool: Pool): Promise<RoleListItem[]> => {
  const result = await pool.query<{
    id: string;
    display_name: string;
    role_class: RoleClass;
    assignment_count: string;
  }>(`
    SELECT
      r.id,
      r.display_name,
      r.role_class,
      COUNT(ur.user_id)::text AS assignment_count
    FROM latch_roles r
    LEFT JOIN latch_user_roles ur ON ur.role_id = r.id
    GROUP BY r.id, r.display_name, r.role_class
    ORDER BY
      CASE r.role_class
        WHEN 'system_data' THEN 0
        WHEN 'system_iam' THEN 1
        ELSE 2
      END,
      r.display_name
  `);

  return result.rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    roleClass: row.role_class,
    assignmentCount: Number(row.assignment_count),
  }));
};
