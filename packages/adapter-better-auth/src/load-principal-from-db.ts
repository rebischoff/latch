import {
  normalizePrincipalBindings,
  type Principal,
  type RoleClass,
} from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool } from "pg";

type PrincipalRow = {
  role_id: string;
  role_class: string;
  scope_id: string | null;
};

const PRINCIPAL_BINDINGS_SQL = `
  SELECT ur.role_id, ur.scope_id, r.role_class
  FROM latch_user_roles ur
  INNER JOIN latch_roles r ON r.id = ur.role_id
  WHERE ur.user_id = $1
`;

const toRoleClass = (raw: string): RoleClass | undefined => {
  if (raw === "system_data" || raw === "system_iam" || raw === "app") {
    return raw;
  }
  return undefined;
};

/**
 * Load a {@link Principal} from `latch_user_roles` + `latch_roles.role_class`.
 * Roles and scope bindings always come from the DB — never from the auth session.
 */
export const loadPrincipalFromDb = async (
  pool: Pool,
  userId: string,
): Promise<Principal> =>
  withPermissionDb(pool, userId, async (client) => {
    const result = await client.query<PrincipalRow>(PRINCIPAL_BINDINGS_SQL, [
      userId,
    ]);
    const bindingRows = result.rows.map((row) => ({
      roleId: row.role_id,
      scopeId: row.scope_id,
      roleClass: toRoleClass(row.role_class),
    }));
    const bindings = normalizePrincipalBindings(bindingRows);
    const roleClasses: Principal["roleClasses"] = {};

    for (const row of bindingRows) {
      if (row.roleClass != null) {
        roleClasses[row.roleId] = row.roleClass;
      }
    }

    const versionResult = await client.query<{ version: string }>(
      "SELECT version FROM latch_policy_version WHERE id = 1",
    );
    const rawVersion = versionResult.rows[0]?.version;
    const policyVersion =
      rawVersion != null ? Number(rawVersion) : undefined;

    return {
      id: userId,
      bindings,
      ...(Object.keys(roleClasses).length > 0 ? { roleClasses } : {}),
      ...(policyVersion !== undefined ? { policyVersion } : {}),
    };
  });
