import type { Principal, RoleId } from "@latch/contracts";
import type { PoolClient } from "pg";

const USER_ROLES_DETAIL = "user_roles_detail";

export type DelegationContext = {
  /** Roles that grant `write` on `user_roles_detail.role_assignments`. */
  delegatorRoleIds: ReadonlySet<RoleId>;
  /** Delegator role id → assignable app role ids (`latch_role_delegations`). */
  allowListByDelegator: ReadonlyMap<RoleId, ReadonlySet<RoleId>>;
};

type DelegationGrantRow = {
  role_id: string;
};

type DelegationRow = {
  role_id: string;
  assignable_role_id: string;
};

const DELEGATOR_ROLES_SQL = `
  SELECT DISTINCT g.role_id
  FROM latch_role_grants g
  WHERE g.surface_id = $1
    AND g.field_id = 'role_assignments'
    AND g.action = 'write'
`;

const DELEGATIONS_SQL = `
  SELECT role_id, assignable_role_id
  FROM latch_role_delegations
`;

export const loadDelegationContextFromPg = async (
  client: PoolClient,
): Promise<DelegationContext> => {
  const [delegators, delegations] = await Promise.all([
    client.query<DelegationGrantRow>(DELEGATOR_ROLES_SQL, [USER_ROLES_DETAIL]),
    client.query<DelegationRow>(DELEGATIONS_SQL),
  ]);

  const delegatorRoleIds = new Set(
    delegators.rows.map((row) => row.role_id),
  );

  const allowListByDelegator = new Map<RoleId, Set<RoleId>>();
  for (const row of delegations.rows) {
    const list = allowListByDelegator.get(row.role_id) ?? new Set();
    list.add(row.assignable_role_id);
    allowListByDelegator.set(row.role_id, list);
  }

  return {
    delegatorRoleIds,
    allowListByDelegator,
  };
};

/** Scopes the actor may target per delegator role binding (from `Principal.bindings`). */
export const actorDelegatorScopes = (
  principal: Principal,
  delegatorRoleIds: ReadonlySet<RoleId>,
): Map<RoleId, Set<string | null>> => {
  const scopesByRole = new Map<RoleId, Set<string | null>>();
  for (const binding of principal.bindings) {
    if (!delegatorRoleIds.has(binding.roleId)) {
      continue;
    }
    const scopes = scopesByRole.get(binding.roleId) ?? new Set();
    scopes.add(binding.scopeId);
    scopesByRole.set(binding.roleId, scopes);
  }
  return scopesByRole;
};

export const actorHoldsSystemIam = (actor: Principal): boolean =>
  Object.values(actor.roleClasses ?? {}).some((c) => c === "system_iam");
