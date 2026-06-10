import type { Principal, RoleBinding } from "@latch/contracts";
import { principalRoleIds } from "@latch/contracts";
import { PolicyService, type PolicyRegistry } from "@latch/policy";
import type { Pool } from "pg";

import { preloadRoleGrantProvider } from "./preload-role-grants.js";

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

/**
 * Load a {@link Principal} from `latch_user_roles` + `latch_roles.role_class`.
 * Bindings carry optional `scope_id`; `roleClasses` drives system synthesis (P11).
 */
export const loadPrincipalFromDb = async (
  pool: Pool,
  userId: string,
): Promise<Principal> => {
  const result = await pool.query<PrincipalRow>(PRINCIPAL_BINDINGS_SQL, [
    userId,
  ]);
  const bindings: RoleBinding[] = result.rows.map((row) => ({
    roleId: row.role_id,
    scopeId: row.scope_id,
  }));
  const roleClasses: Principal["roleClasses"] = {};

  for (const row of result.rows) {
    if (
      row.role_class === "system_data" ||
      row.role_class === "system_iam" ||
      row.role_class === "app"
    ) {
      roleClasses[row.role_id] = row.role_class;
    }
  }

  return {
    id: userId,
    bindings,
    ...(Object.keys(roleClasses).length > 0 ? { roleClasses } : {}),
  };
};

/**
 * Request bootstrap: preload grants for held role ids, wire sync provider.
 * Same pattern the template app will use when building `PermissionContext`.
 */
export const createPolicyServiceForPrincipal = async (
  pool: Pool,
  principal: Principal,
  registry: PolicyRegistry,
): Promise<PolicyService> => {
  const grantProvider = await preloadRoleGrantProvider(
    pool,
    principalRoleIds(principal),
  );
  return new PolicyService({ registry, grantProvider });
};
