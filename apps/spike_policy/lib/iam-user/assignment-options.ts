import type { Principal } from "@latch/contracts";
import type { Pool } from "pg";

import type { RoleListItem } from "../iam/list-roles.js";
import {
  actorHoldsSystemIam,
  loadDelegationContextFromPg,
} from "./delegation-context.js";
import { listAssignableScopesForActor } from "./list-scopes.js";
import type { ScopeListItem } from "./list-scopes.js";

export type AssignmentOptions = {
  roles: RoleListItem[];
  scopes: ScopeListItem[];
};

/** Roles + scopes the actor may assign (server-enforced; UI mirrors these lists). */
export const resolveAssignmentOptions = async (
  pool: Pool,
  principal: Principal,
  allRoles: RoleListItem[],
): Promise<AssignmentOptions> => {
  const scopes = await listAssignableScopesForActor(pool, principal);

  if (actorHoldsSystemIam(principal)) {
    return { roles: allRoles, scopes };
  }

  const delegation = await loadDelegationContextFromPg(pool);
  const allowedRoleIds = new Set<string>();
  for (const binding of principal.bindings) {
    const list = delegation.allowListByDelegator.get(binding.roleId);
    if (list) {
      for (const roleId of list) {
        allowedRoleIds.add(roleId);
      }
    }
  }

  return {
    roles: allRoles.filter(
      (role) => role.roleClass === "app" && allowedRoleIds.has(role.id),
    ),
    scopes,
  };
};
