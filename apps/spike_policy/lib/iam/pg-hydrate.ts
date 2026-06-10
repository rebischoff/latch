import type { PoolClient } from "pg";

import {
  MemoryRoleStore,
  type GrantRecord,
  type RoleClass,
  type RoleRecord,
  type SurfaceBindingRecord,
} from "./memory-role-store.js";

type PgRoleRow = {
  id: string;
  role_class: string;
  display_name: string;
};

type PgBindingRow = {
  role_id: string;
  surface_id: string;
  row_scope: string | null;
};

type PgGrantRow = {
  role_id: string;
  surface_id: string;
  field_id: string | null;
  action: string;
};

type PgAssignmentRow = {
  user_id: string;
  role_id: string;
};

/** Load the full role catalog from Postgres into an in-memory store for DAL operations. */
export const hydrateMemoryRoleStoreFromPg = async (
  client: PoolClient,
): Promise<MemoryRoleStore> => {
  const rolesResult = await client.query<PgRoleRow>(
    "SELECT id, role_class, display_name FROM latch_roles",
  );
  const bindingsResult = await client.query<PgBindingRow>(
    "SELECT role_id, surface_id, row_scope FROM latch_role_surfaces",
  );
  const grantsResult = await client.query<PgGrantRow>(
    "SELECT role_id, surface_id, field_id, action FROM latch_role_grants",
  );
  const assignmentsResult = await client.query<PgAssignmentRow>(
    "SELECT user_id, role_id FROM latch_user_roles",
  );

  const roles: RoleRecord[] = rolesResult.rows.map((row) => ({
    id: row.id,
    roleClass: row.role_class as RoleClass,
    displayName: row.display_name,
  }));

  const bindings: Record<string, SurfaceBindingRecord[]> = {};
  for (const row of bindingsResult.rows) {
    (bindings[row.role_id] ??= []).push({
      surfaceId: row.surface_id,
      rowScope: row.row_scope as SurfaceBindingRecord["rowScope"],
    });
  }

  const grants: Record<string, GrantRecord[]> = {};
  for (const row of grantsResult.rows) {
    (grants[row.role_id] ??= []).push({
      surfaceId: row.surface_id,
      fieldId: row.field_id,
      action: row.action,
    });
  }

  const assignments: Record<string, string[]> = {};
  for (const row of assignmentsResult.rows) {
    (assignments[row.role_id] ??= []).push(row.user_id);
  }

  return new MemoryRoleStore({ roles, bindings, grants, assignments });
};

/** Persist one role row plus bindings and grants after an in-memory DAL mutation. */
export const persistRoleToPg = async (
  client: PoolClient,
  store: MemoryRoleStore,
  roleId: string,
  options?: { isNew?: boolean },
): Promise<void> => {
  const role = store.get(roleId);
  if (!role) {
    return;
  }

  if (options?.isNew) {
    await client.query(
      `INSERT INTO latch_roles (id, role_class, display_name) VALUES ($1, $2, $3)`,
      [role.id, role.roleClass, role.displayName],
    );
  } else {
    await client.query(
      `UPDATE latch_roles SET display_name = $2 WHERE id = $1`,
      [role.id, role.displayName],
    );
  }

  const related = store.getRelated(roleId);

  await client.query(`DELETE FROM latch_role_surfaces WHERE role_id = $1`, [
    roleId,
  ]);
  for (const binding of related.bindings) {
    await client.query(
      `INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope) VALUES ($1, $2, $3)`,
      [roleId, binding.surfaceId, binding.rowScope],
    );
  }

  await client.query(`DELETE FROM latch_role_grants WHERE role_id = $1`, [
    roleId,
  ]);
  for (const grant of related.grants) {
    await client.query(
      `INSERT INTO latch_role_grants (role_id, surface_id, field_id, action) VALUES ($1, $2, $3, $4)`,
      [roleId, grant.surfaceId, grant.fieldId, grant.action],
    );
  }
};

export const deleteRoleFromPg = async (
  client: PoolClient,
  roleId: string,
): Promise<void> => {
  await client.query(`DELETE FROM latch_roles WHERE id = $1`, [roleId]);
};
