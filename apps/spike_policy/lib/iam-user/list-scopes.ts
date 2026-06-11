import type { Principal } from "@latch/contracts";
import type { Pool, PoolClient } from "pg";

import {
  actorDelegatorScopes,
  actorHoldsSystemIam,
  loadDelegationContextFromPg,
} from "./delegation-context.js";

export type ScopeListItem = {
  id: string;
  displayName: string;
  kind: string;
};

const LIST_SCOPES_SQL = `
  SELECT id, kind, display_name
  FROM latch_scopes
  ORDER BY display_name, id
`;

export const listScopesFromPg = async (
  client: PoolClient | Pool,
): Promise<ScopeListItem[]> => {
  const result = await client.query<{
    id: string;
    kind: string;
    display_name: string;
  }>(LIST_SCOPES_SQL);
  return result.rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    kind: row.kind,
  }));
};

/** Scopes the actor may assign into (server-enforced; UI mirrors this list). */
export const listAssignableScopesForActor = async (
  pool: Pool,
  principal: Principal,
): Promise<ScopeListItem[]> => {
  const allScopes = await listScopesFromPg(pool);
  if (actorHoldsSystemIam(principal)) {
    return allScopes;
  }

  const delegation = await loadDelegationContextFromPg(pool);
  const scopesByDelegator = actorDelegatorScopes(
    principal,
    delegation.delegatorRoleIds,
  );
  const allowedScopeIds = new Set<string>();
  let companyWide = false;
  for (const scopes of scopesByDelegator.values()) {
    for (const scopeId of scopes) {
      if (scopeId === null) {
        companyWide = true;
      } else {
        allowedScopeIds.add(scopeId);
      }
    }
  }

  if (companyWide) {
    return allScopes;
  }

  return allScopes.filter((scope) => allowedScopeIds.has(scope.id));
};
