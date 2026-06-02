import { MemoryJobStore } from "./jobs/memory-store.js";
/** Default `LATCH_STUB_USER` / field_tech principal (task 15). */
export declare const SEED_TECH_ID = "seed-field-tech";
/** `office_admin` principal for S3 financial Field checks. */
export declare const SEED_ADMIN_ID = "seed-office-admin";
/** Job assigned to {@link SEED_TECH_ID} — row-scope `own` passes for tech. */
export declare const SEED_JOB_OWNED = "seed-job-owned";
/** Job assigned to admin — tech row-scope `own` fails (S4 → 404). */
export declare const SEED_JOB_OTHER = "seed-job-other";
/**
 * Populates a {@link MemoryJobStore} with two seed users and two jobs.
 * Job A → field tech; job B → office admin (cross-principal for S4).
 */
export declare const seedPilotJobs: (store: MemoryJobStore) => void;
//# sourceMappingURL=seed.d.ts.map