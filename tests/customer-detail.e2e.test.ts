import { afterEach, describe, expect, it } from "vitest";

import { createMemoryPendingStore } from "@latch/approval";
import { createMemoryAuditWriter, setAuditWriter } from "@latch/audit";
import {
  NotFoundError,
  ValidationError,
  type PermissionContext,
} from "@latch/contracts";
import {
  createCustomersDal,
  createJobsDal,
  createJobPolicyService,
  MemoryJobStore,
  SEED_ADMIN_ID,
  SEED_CUSTOMER_ACME,
  SEED_JOB_OWNED,
  SEED_TECH_ID,
  seedPilotJobs,
} from "@latch/crm/test-utils";

const policy = createJobPolicyService();
const audit = createMemoryAuditWriter();

afterEach(() => {
  audit.reset();
  setAuditWriter(null);
});

const buildCustomerCtx = (
  userId: string,
  roles: string[],
  entityId?: string,
): PermissionContext => {
  const principal = { id: userId, roles };
  const manifest = policy.resolve(principal, {
    surface: "customer_detail",
    entityId,
    mode: "detail",
  });
  return { principal, manifest, surface: "customer_detail" };
};

const buildJobCtx = (
  userId: string,
  roles: string[],
  entityId?: string,
): PermissionContext => {
  const principal = { id: userId, roles };
  const manifest = policy.resolve(principal, {
    surface: "job_detail",
    entityId,
    mode: "detail",
  });
  return { principal, manifest, surface: "job_detail" };
};

describe("customer_detail — policy → DAL → DTO (e2e)", () => {
  it("admin vs tech manifests; admin get; tech 404; T2 omission; strict patch; profile patch; customer_ref on job_detail", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const customersDal = createCustomersDal(store);
    const jobsDal = createJobsDal(store, createMemoryPendingStore());

    const adminCtx = buildCustomerCtx(SEED_ADMIN_ID, ["office_admin"]);
    const techCtx = buildCustomerCtx(SEED_TECH_ID, ["field_tech"]);

    expect(adminCtx.manifest.rowScope).toBe("all");
    expect(adminCtx.manifest.fields.profile).toEqual(
      expect.arrayContaining(["read", "write"]),
    );
    expect(techCtx.manifest.actions).toEqual([]);

    const adminDto = customersDal.get(adminCtx, SEED_CUSTOMER_ACME);

    expect(adminDto.id).toBe(SEED_CUSTOMER_ACME);
    expect(adminDto.profile).toEqual({
      name: "Acme Electric",
      phone: "555-0100",
    });
    expect(adminDto.billing?.billing_notes).toContain("Net 30");
    expect(adminDto.sites).toEqual([{ label: "123 Main St" }]);
    expect(adminDto.job_history).toEqual([
      {
        id: SEED_JOB_OWNED,
        title: "Panel upgrade — 123 Main St",
        status: "scheduled",
      },
    ]);

    expect(() =>
      customersDal.get(techCtx, SEED_CUSTOMER_ACME),
    ).toThrow(NotFoundError);

    const billingDeniedCtx: PermissionContext = {
      principal: { id: SEED_ADMIN_ID, roles: ["office_admin"] },
      surface: "customer_detail",
      manifest: {
        surface: "customer_detail",
        actions: ["read"],
        rowScope: "all",
        fields: {
          profile: ["read"],
          sites: ["read"],
          job_history: ["read"],
        },
      },
    };
    const partialDto = customersDal.get(billingDeniedCtx, SEED_CUSTOMER_ACME);
    expect(partialDto.profile).toBeDefined();
    expect(partialDto).not.toHaveProperty("billing");

    await expect(
      customersDal.patch(adminCtx, SEED_CUSTOMER_ACME, {
        profile: { name: "Should not apply" },
        evil: true,
      }),
    ).rejects.toThrow(ValidationError);

    const patched = await customersDal.patch(adminCtx, SEED_CUSTOMER_ACME, {
      profile: { name: "Acme Electric — e2e", phone: "555-0199" },
    });
    expect(patched.profile?.name).toBe("Acme Electric — e2e");

    const reloaded = customersDal.get(adminCtx, SEED_CUSTOMER_ACME);
    expect(reloaded.profile).toEqual({
      name: "Acme Electric — e2e",
      phone: "555-0199",
    });

    const adminJob = jobsDal.get(
      buildJobCtx(SEED_ADMIN_ID, ["office_admin"]),
      SEED_JOB_OWNED,
    );
    expect(adminJob.customer_ref).toEqual({
      id: SEED_CUSTOMER_ACME,
      name: "Acme Electric — e2e",
    });

    const techJob = jobsDal.get(
      buildJobCtx(SEED_TECH_ID, ["field_tech"]),
      SEED_JOB_OWNED,
    );
    expect(techJob.summary?.title).toContain("Panel upgrade");
    expect(techJob).not.toHaveProperty("customer_ref");
  });
});
