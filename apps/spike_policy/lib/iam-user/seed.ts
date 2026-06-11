import type { RoleRecord } from "../iam/memory-role-store.js";
import { seedSystemRoles } from "../iam/memory-role-store.js";
import type { DelegationContext } from "./delegation-context.js";
import {
  BRANCH_ADMIN_ID,
  BRANCH_B_SCOPE_ID,
  FIELD_TECH_ID,
  MARIA_USER_ID,
  OFFICE_ADMIN_ID,
  UNION_DEMO_A_ID,
  SEED_ADMIN_USER_ID,
  SEED_IAM_USER_ID,
  SEED_TECH_USER_ID,
  SYSTEM_IAM_ID,
} from "./fixture-ids.js";
import type { MemoryUserStore } from "./memory-user-store.js";

export const pilotAppRoles = (): RoleRecord[] => [
  {
    id: FIELD_TECH_ID,
    roleClass: "app",
    displayName: "Field technician",
  },
  {
    id: OFFICE_ADMIN_ID,
    roleClass: "app",
    displayName: "Office admin",
  },
  {
    id: BRANCH_ADMIN_ID,
    roleClass: "app",
    displayName: "Branch admin",
  },
  {
    id: UNION_DEMO_A_ID,
    roleClass: "app",
    displayName: "Union demo A",
  },
];

export const roleCatalogForHarness = (): Map<
  string,
  { id: string; roleClass: RoleRecord["roleClass"] }
> => {
  const map = new Map<string, { id: string; roleClass: RoleRecord["roleClass"] }>();
  for (const role of [...seedSystemRoles(), ...pilotAppRoles()]) {
    map.set(role.id, { id: role.id, roleClass: role.roleClass });
  }
  return map;
};

/** Harness delegation fixture — mirrors `902_fixture_scoped_delegation.sql`. */
export const delegationContextForHarness = (): DelegationContext => ({
  delegatorRoleIds: new Set([BRANCH_ADMIN_ID]),
  allowListByDelegator: new Map([
    [BRANCH_ADMIN_ID, new Set([FIELD_TECH_ID, OFFICE_ADMIN_ID])],
  ]),
});

/** Deterministic users + assignments for IAM harness tests. */
export const seedPilotUsers = (store: MemoryUserStore): void => {
  store.clear();
  store.upsertUser({ id: SEED_IAM_USER_ID, displayName: "IAM Admin (seed)" });
  store.upsertUser({ id: SEED_TECH_USER_ID, displayName: "Field Tech (seed)" });
  store.upsertUser({
    id: SEED_ADMIN_USER_ID,
    displayName: "Office Admin (seed)",
  });
  store.upsertUser({ id: MARIA_USER_ID, displayName: "Maria (Branch B admin)" });
  store.setUserRoles(SEED_IAM_USER_ID, [SYSTEM_IAM_ID]);
  store.setUserRoles(SEED_TECH_USER_ID, [FIELD_TECH_ID]);
  store.setUserRoles(SEED_ADMIN_USER_ID, [OFFICE_ADMIN_ID]);
  store.setUserBindings(MARIA_USER_ID, [
    { roleId: BRANCH_ADMIN_ID, scopeId: BRANCH_B_SCOPE_ID },
  ]);
};
