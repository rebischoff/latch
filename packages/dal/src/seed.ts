import { MemoryJobStore } from "./jobs/memory-store.js";

/** Default `LATCH_STUB_USER` / field_tech principal (task 15). */
export const SEED_TECH_ID = "seed-field-tech";

/** `office_admin` principal for S3 financial Field checks. */
export const SEED_ADMIN_ID = "seed-office-admin";

/** Job assigned to {@link SEED_TECH_ID} — row-scope `own` passes for tech. */
export const SEED_JOB_OWNED = "seed-job-owned";

/** Job assigned to admin — tech row-scope `own` fails (S4 → 404). */
export const SEED_JOB_OTHER = "seed-job-other";

const PILOT_NOW = new Date("2026-05-01T12:00:00.000Z");

/**
 * Populates a {@link MemoryJobStore} with two seed users and two jobs.
 * Job A → field tech; job B → office admin (cross-principal for S4).
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

  store.upsertJob({
    id: SEED_JOB_OWNED,
    title: "Panel upgrade — 123 Main St",
    status: "scheduled",
    scheduledAt: PILOT_NOW,
    description: "Replace main panel and two subpanels.",
    contractAmount: "12500.00",
  });
  store.addAssignment({ jobId: SEED_JOB_OWNED, userId: SEED_TECH_ID });

  store.upsertJob({
    id: SEED_JOB_OTHER,
    title: "HVAC install — 456 Oak Ave",
    status: "in_progress",
    scheduledAt: PILOT_NOW,
    description: "New split system installation.",
    contractAmount: "8900.00",
  });
  store.addAssignment({ jobId: SEED_JOB_OTHER, userId: SEED_ADMIN_ID });
};
