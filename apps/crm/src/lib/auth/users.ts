import type { RoleId } from "@latch/contracts";
import { SEED_ADMIN_ID, SEED_TECH_ID } from "@latch/dal";

export type CrmUser = {
  id: string;
  roles: RoleId[];
  label: string;
};

const USERS_BY_LOGIN: Record<string, CrmUser> = {
  "tech@demo.local": {
    id: SEED_TECH_ID,
    roles: ["field_tech"],
    label: "tech@demo.local",
  },
  "admin@demo.local": {
    id: SEED_ADMIN_ID,
    roles: ["office_admin"],
    label: "admin@demo.local",
  },
};

export const lookupUser = (login: string): CrmUser | undefined => {
  return USERS_BY_LOGIN[login.trim().toLowerCase()];
};

export const getDevPassword = (): string => {
  return process.env.CRM_DEV_PASSWORD ?? "demo";
};
