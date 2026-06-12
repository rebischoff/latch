import { MemoryJobStore } from "./memory-store.js";

/** Default `LATCH_STUB_USER` / field_tech principal (task 15). */
export const SEED_TECH_ID = "seed-field-tech";

/** `office_admin` principal for S3 financial Field checks. */
export const SEED_ADMIN_ID = "seed-office-admin";

/** Optional QA principal with `iam_master` (Phase 03 IAM API / T8). */
export const SEED_IAM_ID = "seed-iam-admin";

/** Acme Electric — matches `SEED_JOB_OWNED` pilot job. */
export const SEED_CUSTOMER_ACME = "seed-customer-acme";

/** Oak Properties — matches `SEED_JOB_OTHER` pilot job. */
export const SEED_CUSTOMER_OAK = "seed-customer-oak";

export const SEED_SITE_ACME_MAIN = "seed-site-acme-main";

export const SEED_SITE_OAK_AVE = "seed-site-oak-ave";

/** Job assigned to {@link SEED_TECH_ID} — row-scope `own` passes for tech. */
export const SEED_JOB_OWNED = "seed-job-owned";

/** Job assigned to admin — tech row-scope `own` fails (S4 → 404). */
export const SEED_JOB_OTHER = "seed-job-other";

const PILOT_NOW = new Date("2026-05-01T12:00:00.000Z");

const seedPilotCustomers = (store: MemoryJobStore): void => {
  store.upsertCustomer({
    id: SEED_CUSTOMER_ACME,
    name: "Acme Electric",
    phone: "555-0100",
    billingNotes: "Net 30; PO required on invoices over $5k.",
  });
  store.upsertCustomer({
    id: SEED_CUSTOMER_OAK,
    name: "Oak Properties",
    phone: "555-0200",
    billingNotes: "Send statements to property mgmt portal.",
  });

  store.upsertSite({
    id: SEED_SITE_ACME_MAIN,
    customerId: SEED_CUSTOMER_ACME,
    label: "123 Main St",
  });
  store.upsertSite({
    id: SEED_SITE_OAK_AVE,
    customerId: SEED_CUSTOMER_OAK,
    label: "456 Oak Ave",
  });
};

/**
 * Populates a {@link MemoryJobStore} with seed users, customers, sites, and jobs.
 * Job A → field tech + Acme; job B → office admin + Oak (cross-principal for S4).
 */
export const seedPilotJobs = (store: MemoryJobStore): void => {
  store.clear();

  store.upsertUser({
    id: SEED_TECH_ID,
    displayName: "Field Tech (seed)",
  });
  store.upsertUser({
    id: SEED_ADMIN_ID,
    displayName: "Office Admin (seed)",
  });
  store.upsertUser({
    id: SEED_IAM_ID,
    displayName: "IAM Admin (seed)",
  });

  store.setUserRoles(SEED_TECH_ID, ["field_tech"]);
  store.setUserRoles(SEED_ADMIN_ID, ["office_admin"]);
  store.setUserRoles(SEED_IAM_ID, ["iam_master"]);

  seedPilotCustomers(store);

  store.upsertJob({
    id: SEED_JOB_OWNED,
    title: "Panel upgrade — 123 Main St",
    status: "scheduled",
    scheduledAt: PILOT_NOW,
    description: "Replace main panel and two subpanels.",
    contractAmount: "12500.00",
    customerId: SEED_CUSTOMER_ACME,
  });
  store.addAssignment({ jobId: SEED_JOB_OWNED, userId: SEED_TECH_ID });

  store.upsertJob({
    id: SEED_JOB_OTHER,
    title: "HVAC install — 456 Oak Ave",
    status: "in_progress",
    scheduledAt: PILOT_NOW,
    description: "New split system installation.",
    contractAmount: "8900.00",
    customerId: SEED_CUSTOMER_OAK,
  });
  store.addAssignment({ jobId: SEED_JOB_OTHER, userId: SEED_ADMIN_ID });
};
