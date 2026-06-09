import type { RoleId } from "@latch/contracts";
import {
  MemoryRoleGrantProvider,
  type RoleGrantProvider,
} from "@latch/policy";
import type { Pool } from "pg";

import { foldRoleGrantRows, type RoleGrantRow } from "./fold-role-grants.js";

type GrantQueryRow = {
  role_id: string;
  surface_id: string;
  field_id: string | null;
  action: string;
  row_scope: string | null;
};

const GRANTS_FOR_ROLES_SQL = `
  SELECT
    g.role_id,
    g.surface_id,
    g.field_id,
    g.action,
    rs.row_scope
  FROM latch_role_grants g
  INNER JOIN latch_role_surfaces rs
    ON rs.role_id = g.role_id
   AND rs.surface_id = g.surface_id
  WHERE g.role_id = ANY($1::uuid[])
`;

const mapQueryRow = (row: GrantQueryRow): RoleGrantRow => ({
  roleId: row.role_id,
  surfaceId: row.surface_id,
  fieldId: row.field_id,
  action: row.action,
  rowScope: row.row_scope,
});

/**
 * Load grant rows for the principal's role ids (request-scoped preload).
 * Returns bindings for every role×surface that has at least one grant row.
 */
export const preloadRoleGrantBindings = async (
  pool: Pool,
  roleIds: RoleId[],
): Promise<ReturnType<typeof foldRoleGrantRows>> => {
  if (roleIds.length === 0) {
    return [];
  }

  const result = await pool.query<GrantQueryRow>(GRANTS_FOR_ROLES_SQL, [
    roleIds,
  ]);

  return foldRoleGrantRows(result.rows.map(mapQueryRow));
};

/**
 * Build a sync {@link RoleGrantProvider} snapshot from Postgres grant rows.
 * Call once per request at bootstrap; pass to `PolicyService` unchanged.
 */
export const preloadRoleGrantProvider = async (
  pool: Pool,
  roleIds: RoleId[],
): Promise<MemoryRoleGrantProvider> => {
  const bindings = await preloadRoleGrantBindings(pool, roleIds);
  return new MemoryRoleGrantProvider(bindings);
};
