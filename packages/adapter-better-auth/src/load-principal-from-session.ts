import {
  normalizePrincipalBindings,
  type Principal,
  type RoleClass,
} from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool } from "pg";

import type { ProviderSession } from "./provider-session";
import { resolveLatchUserIdOnClient } from "./resolve-latch-user-id-on-client";

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
 * Resolve Better Auth session → {@link Principal} in one pooled transaction.
 * Replaces separate `resolveLatchUserId` + `loadPrincipalFromDb` round-trips.
 */
export const loadPrincipalFromSession = async (
  pool: Pool,
  session: ProviderSession,
): Promise<Principal> =>
  withPermissionDb(pool, session.userId, async (client) => {
    const latchUserId = await resolveLatchUserIdOnClient(client, {
      subject: session.userId,
      email: session.email,
    });

    const result = await client.query<PrincipalRow>(PRINCIPAL_BINDINGS_SQL, [
      latchUserId,
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
      id: latchUserId,
      bindings,
      ...(Object.keys(roleClasses).length > 0 ? { roleClasses } : {}),
      ...(policyVersion !== undefined ? { policyVersion } : {}),
    };
  });
