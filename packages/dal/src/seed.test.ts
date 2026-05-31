import { describe, expect, it } from "vitest";

import { MemoryJobStore } from "./jobs/memory-store.js";
import {
  SEED_ADMIN_ID,
  SEED_JOB_OTHER,
  SEED_JOB_OWNED,
  SEED_TECH_ID,
  seedPilotJobs,
} from "./seed.js";

describe("seedPilotJobs", () => {
  it("populates memory store with two jobs and correct assignments", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);

    expect(store.users.size).toBe(2);
    expect(store.jobs.size).toBe(2);
    expect(store.getJob(SEED_JOB_OWNED)?.title).toContain("Panel upgrade");
    expect(store.getJob(SEED_JOB_OTHER)?.title).toContain("HVAC");

    expect(store.isUserAssignedToJob(SEED_JOB_OWNED, SEED_TECH_ID)).toBe(true);
    expect(store.isUserAssignedToJob(SEED_JOB_OWNED, SEED_ADMIN_ID)).toBe(
      false,
    );
    expect(store.isUserAssignedToJob(SEED_JOB_OTHER, SEED_ADMIN_ID)).toBe(true);
    expect(store.isUserAssignedToJob(SEED_JOB_OTHER, SEED_TECH_ID)).toBe(false);
  });
});
