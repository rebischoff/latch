import type { RoleRecord } from "../iam/memory-role-store.js";
import { seedSystemRoles } from "../iam/memory-role-store.js";
import {
  FIELD_TECH_ID,
  OFFICE_ADMIN_ID,
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

/** Deterministic users + assignments for IAM harness tests. */
export const seedPilotUsers = (store: MemoryUserStore): void => {
  store.clear();
  store.upsertUser({ id: SEED_IAM_USER_ID, displayName: "IAM Admin (seed)" });
  store.upsertUser({ id: SEED_TECH_USER_ID, displayName: "Field Tech (seed)" });
  store.upsertUser({
    id: SEED_ADMIN_USER_ID,
    displayName: "Office Admin (seed)",
  });
  store.setUserRoles(SEED_IAM_USER_ID, [SYSTEM_IAM_ID]);
  store.setUserRoles(SEED_TECH_USER_ID, [FIELD_TECH_ID]);
  store.setUserRoles(SEED_ADMIN_USER_ID, [OFFICE_ADMIN_ID]);
};
