import { ForbiddenError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import type {
  RoleDetailRelated,
  RoleDetailRow,
  RoleGrantTuple,
  SurfaceBindingTuple,
  UserRolesRow,
} from "./descriptors.js";

export type { RoleGrantTuple, SurfaceBindingTuple };

export const bumpPolicyVersion = async (client: PoolClient): Promise<void> => {
  await client.query(
    `UPDATE latch_policy_version SET version = version + 1 WHERE id = 1`,
  );
};

export const loadUserRolesRow = async (
  pool: Pool,
  userId: string,
): Promise<UserRolesRow | undefined> => {
  const result = await pool.query<UserRolesRow>(
    `SELECT id, login_name, login_email FROM latch_users WHERE id = $1`,
    [userId],
  );
  return result.rows[0];
};

export const loadUserRoleIds = async (
  pool: Pool,
  userId: string,
): Promise<string[]> => {
  const result = await pool.query<{ role_id: string }>(
    `SELECT role_id::text AS role_id
     FROM latch_user_roles
     WHERE user_id = $1
     ORDER BY role_id`,
    [userId],
  );
  return result.rows.map((row) => row.role_id);
};

export const allRoleIdsExist = async (
  pool: Pool,
  roleIds: string[],
): Promise<boolean> => {
  if (roleIds.length === 0) {
    return true;
  }

  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM latch_roles WHERE id = ANY($1::uuid[])`,
    [roleIds],
  );

  return (result.rows[0]?.count ?? 0) === roleIds.length;
};

export const replaceUserRoles = async (
  pool: Pool,
  actorId: string,
  userId: string,
  roleIds: string[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(`DELETE FROM latch_user_roles WHERE user_id = $1`, [
      userId,
    ]);

    for (const roleId of roleIds) {
      await client.query(
        `INSERT INTO latch_user_roles (user_id, role_id) VALUES ($1, $2::uuid)`,
        [userId, roleId],
      );
    }

    await bumpPolicyVersion(client);
  });
};

export const loadRoleDetailRow = async (
  pool: Pool,
  roleId: string,
): Promise<RoleDetailRow | undefined> => {
  const result = await pool.query<RoleDetailRow>(
    `SELECT id::text AS id, role_class, display_name
     FROM latch_roles
     WHERE id = $1::uuid`,
    [roleId],
  );
  return result.rows[0];
};

export const loadRoleDetailRelated = async (
  pool: Pool,
  roleId: string,
): Promise<RoleDetailRelated> => {
  const bindingsResult = await pool.query<SurfaceBindingTuple>(
    `SELECT surface_id, row_scope
     FROM latch_role_surfaces
     WHERE role_id = $1::uuid
     ORDER BY surface_id`,
    [roleId],
  );

  const grantsResult = await pool.query<RoleGrantTuple>(
    `SELECT surface_id, field_id, action, mode
     FROM latch_role_grants
     WHERE role_id = $1::uuid
     ORDER BY surface_id, field_id NULLS FIRST, action`,
    [roleId],
  );

  return {
    surfaceBindings: bindingsResult.rows,
    grants: grantsResult.rows,
  };
};

export const updateRoleDisplayName = async (
  pool: Pool,
  actorId: string,
  roleId: string,
  displayName: string,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(
      `UPDATE latch_roles SET display_name = $2 WHERE id = $1::uuid`,
      [roleId, displayName],
    );
  });
};

export const replaceRoleSurfaceBindings = async (
  pool: Pool,
  actorId: string,
  roleId: string,
  bindings: SurfaceBindingTuple[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(
      `DELETE FROM latch_role_surfaces WHERE role_id = $1::uuid`,
      [roleId],
    );

    for (const binding of bindings) {
      await client.query(
        `INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope)
         VALUES ($1::uuid, $2, $3)`,
        [roleId, binding.surface_id, binding.row_scope],
      );
    }

    await bumpPolicyVersion(client);
  });
};

export const replaceRoleGrants = async (
  pool: Pool,
  actorId: string,
  roleId: string,
  grants: RoleGrantTuple[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(
      `DELETE FROM latch_role_grants WHERE role_id = $1::uuid`,
      [roleId],
    );

    for (const grant of grants) {
      await client.query(
        `INSERT INTO latch_role_grants (role_id, surface_id, field_id, action, mode)
         VALUES ($1::uuid, $2, $3, $4, $5)`,
        [
          roleId,
          grant.surface_id,
          grant.field_id,
          grant.action,
          grant.mode,
        ],
      );
    }

    await bumpPolicyVersion(client);
  });
};

export const deleteAppRole = async (
  pool: Pool,
  actorId: string,
  roleId: string,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(`DELETE FROM latch_roles WHERE id = $1::uuid`, [roleId]);
    await bumpPolicyVersion(client);
  });
};

export const isSystemRoleClass = (roleClass: string): boolean =>
  roleClass === "system_data" || roleClass === "system_iam";

export const assertNotLastSystemRoleHolder = async (
  pool: Pool,
  userId: string,
  newRoleIds: string[],
): Promise<void> => {
  const currentRoleIds = await loadUserRoleIds(pool, userId);
  const removedRoleIds = currentRoleIds.filter((id) => !newRoleIds.includes(id));

  if (removedRoleIds.length === 0) {
    return;
  }

  for (const roleId of removedRoleIds) {
    const row = await loadRoleDetailRow(pool, roleId);
    if (!row || !isSystemRoleClass(row.role_class)) {
      continue;
    }

    const countResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM latch_user_roles ur
       JOIN latch_roles r ON r.id = ur.role_id
       WHERE r.role_class = $1`,
      [row.role_class],
    );

    if ((countResult.rows[0]?.count ?? 0) <= 1) {
      throw new ForbiddenError(`cannot remove last holder of ${row.role_class}`);
    }
  }
};
