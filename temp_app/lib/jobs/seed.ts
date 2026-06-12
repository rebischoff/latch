import { MemoryJobStore } from "./store.js";

export const SEED_TECH_ID = "seed-field-tech";
export const SEED_ADMIN_ID = "seed-office-admin";
export const SEED_CUSTOMER_ACME = "seed-customer-acme";
export const SEED_CUSTOMER_OAK = "seed-customer-oak";
export const SEED_SITE_ACME_MAIN = "seed-site-acme-main";
export const SEED_SITE_OAK_AVE = "seed-site-oak-ave";
export const SEED_JOB_OWNED = "seed-job-owned";
export const SEED_JOB_OTHER = "seed-job-other";

const PILOT_NOW = new Date("2026-05-01T12:00:00.000Z");

/**
 * Populates business tables only — IAM users/roles/grants live in Postgres.
 */
export const seedPilotJobs = (store: MemoryJobStore): void => {
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
