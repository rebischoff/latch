import type { Principal } from "@latch/contracts";
import { PolicyService, type PolicyRegistry } from "@latch/policy";
import type { Pool } from "pg";

import { preloadRoleGrantProvider } from "./preload-role-grants.js";

type PrincipalRow = {
  role_id: string;
  role_class: string;
};

const PRINCIPAL_ROLES_SQL = `
  SELECT ur.role_id, r.role_class
  FROM latch_user_roles ur
  INNER JOIN latch_roles r ON r.id = ur.role_id
  WHERE ur.user_id = $1
`;

/**
 * Load a {@link Principal} from `latch_user_roles` + `latch_roles.role_class`.
 * `roleClasses` drives system synthesis in `PolicyService` (P11).
 */
export const loadPrincipalFromDb = async (
  pool: Pool,
  userId: string,
): Promise<Principal> => {
  const result = await pool.query<PrincipalRow>(PRINCIPAL_ROLES_SQL, [userId]);
  const roles = result.rows.map((row) => row.role_id);
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
    roles,
    ...(Object.keys(roleClasses).length > 0 ? { roleClasses } : {}),
  };
};

/**
 * Request bootstrap: preload grants for `principal.roles`, wire sync provider.
 * Same pattern the template app will use when building `PermissionContext`.
 */
export const createPolicyServiceForPrincipal = async (
  pool: Pool,
  principal: Principal,
  registry: PolicyRegistry,
): Promise<PolicyService> => {
  const grantProvider = await preloadRoleGrantProvider(pool, principal.roles);
  return new PolicyService({ registry, grantProvider });
};
