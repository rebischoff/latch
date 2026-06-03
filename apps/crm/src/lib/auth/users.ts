import {
  SEED_ADMIN_ID,
  SEED_IAM_ID,
  SEED_TECH_ID,
} from "../../../db/seed.js";

/** Dev login map — role assignments live in `latch_user_roles` (see `seedPilotJobs`). */
export type CrmUser = {
  id: string;
  label: string;
};

const USERS_BY_LOGIN: Record<string, CrmUser> = {
  "tech@demo.local": {
    id: SEED_TECH_ID,
    label: "tech@demo.local",
  },
  "admin@demo.local": {
    id: SEED_ADMIN_ID,
    label: "admin@demo.local",
  },
  "iam@demo.local": {
    id: SEED_IAM_ID,
    label: "iam@demo.local",
  },
};

export const lookupUser = (login: string): CrmUser | undefined => {
  return USERS_BY_LOGIN[login.trim().toLowerCase()];
};

export const getDevPassword = (): string => {
  return process.env.CRM_DEV_PASSWORD ?? "demo";
};
