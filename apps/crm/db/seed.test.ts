import { describe, expect, it } from "vitest";

import { MemoryJobStore } from "./memory-store.js";
import {
  SEED_ADMIN_ID,
  SEED_CUSTOMER_ACME,
  SEED_CUSTOMER_OAK,
  SEED_JOB_OTHER,
  SEED_JOB_OWNED,
  SEED_SITE_ACME_MAIN,
  SEED_SITE_OAK_AVE,
  SEED_TECH_ID,
  seedPilotJobs,
} from "./seed.js";

describe("seedPilotJobs", () => {
  it("populates memory store with customers, sites, jobs, and assignments", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);

    expect(store.users.size).toBe(3);

    expect(store.listRolesForUser(SEED_TECH_ID)).toEqual(["field_tech"]);
    expect(store.listRolesForUser(SEED_ADMIN_ID)).toEqual(["office_admin"]);
    expect(store.customers.size).toBe(2);
    expect(store.sites.size).toBe(2);
    expect(store.jobs.size).toBe(2);

    expect(store.getCustomer(SEED_CUSTOMER_ACME)?.name).toBe("Acme Electric");
    expect(store.getCustomer(SEED_CUSTOMER_OAK)?.name).toBe("Oak Properties");
    expect(store.getSite(SEED_SITE_ACME_MAIN)?.label).toBe("123 Main St");
    expect(store.getSite(SEED_SITE_OAK_AVE)?.label).toBe("456 Oak Ave");

    expect(store.getJob(SEED_JOB_OWNED)?.customerId).toBe(SEED_CUSTOMER_ACME);
    expect(store.getJob(SEED_JOB_OTHER)?.customerId).toBe(SEED_CUSTOMER_OAK);
    expect(store.getJob(SEED_JOB_OWNED)?.title).toContain("Panel upgrade");
    expect(store.getJob(SEED_JOB_OTHER)?.title).toContain("HVAC");

    expect(store.getCustomerSiteJoins(store.getJob(SEED_JOB_OWNED)!).customerName).toBe(
      "Acme Electric",
    );
    expect(store.getCustomerSiteJoins(store.getJob(SEED_JOB_OWNED)!).siteLabel).toBe(
      "123 Main St",
    );

    expect(store.isUserAssignedToJob(SEED_JOB_OWNED, SEED_TECH_ID)).toBe(true);
    expect(store.isUserAssignedToJob(SEED_JOB_OWNED, SEED_ADMIN_ID)).toBe(
      false,
    );
    expect(store.isUserAssignedToJob(SEED_JOB_OTHER, SEED_ADMIN_ID)).toBe(true);
    expect(store.isUserAssignedToJob(SEED_JOB_OTHER, SEED_TECH_ID)).toBe(false);
  });
});
