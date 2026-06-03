import { afterEach, describe, expect, it, vi } from "vitest";

import { getPrincipal } from "@/lib/auth/getPrincipal";
import * as providerSession from "@/lib/auth/provider-session.js";
import {
  createJobPolicyService,
  MemoryJobStore,
  principalFromStore,
  resolveManifestFromStore,
  SEED_ADMIN_ID,
  SEED_TECH_ID,
  seedPilotJobs,
} from "@latch/crm/test-utils";

vi.mock("@/lib/auth/provider-session.js", () => ({
  readProviderSession: vi.fn(),
}));

const readProviderSession = vi.mocked(providerSession.readProviderSession);

const policy = createJobPolicyService();

afterEach(() => {
  vi.clearAllMocks();
});

describe("identity — DB roles → manifests (e2e)", () => {
  it("seeded tech vs admin roles drive job_detail financial_terms and customer_detail access", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);

    const tech = await resolveManifestFromStore(
      store,
      SEED_TECH_ID,
      { surface: "job_detail", mode: "detail" },
      policy,
    );
    const admin = await resolveManifestFromStore(
      store,
      SEED_ADMIN_ID,
      { surface: "job_detail", mode: "detail" },
      policy,
    );

    expect(tech.principal.roles).toEqual(["field_tech"]);
    expect(admin.principal.roles).toEqual(["office_admin"]);

    expect(tech.manifest.rowScope).toBe("own");
    expect(tech.manifest.fields.financial_terms).toEqual(["submit"]);
    expect(tech.manifest.fields.customer_ref).toEqual([]);

    expect(admin.manifest.rowScope).toBe("all");
    expect(admin.manifest.fields.financial_terms).toEqual(
      expect.arrayContaining(["read", "write", "approve"]),
    );
    expect(admin.manifest.fields.financial_terms).toHaveLength(3);
    expect(admin.manifest.fields.customer_ref).toEqual(["read"]);

    const techCustomer = await resolveManifestFromStore(
      store,
      SEED_TECH_ID,
      { surface: "customer_detail", mode: "detail" },
      policy,
    );
    const adminCustomer = await resolveManifestFromStore(
      store,
      SEED_ADMIN_ID,
      { surface: "customer_detail", mode: "detail" },
      policy,
    );

    expect(techCustomer.manifest.actions).toEqual([]);
    expect(techCustomer.manifest.fields.profile).toEqual([]);
    expect(adminCustomer.manifest.rowScope).toBe("all");
    expect(adminCustomer.manifest.fields.profile).toEqual(["read", "write"]);
    expect(adminCustomer.manifest.fields.billing).toEqual(["read", "write"]);
  });

  it("user with field_tech + office_admin gets union manifest (financial submit + customer access)", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const userId = "union-role-user";
    store.setUserRoles(userId, ["field_tech", "office_admin"]);

    const jobManifest = (
      await resolveManifestFromStore(
        store,
        userId,
        { surface: "job_detail", mode: "detail" },
        policy,
      )
    ).manifest;
    const customerManifest = (
      await resolveManifestFromStore(
        store,
        userId,
        { surface: "customer_detail", mode: "detail" },
        policy,
      )
    ).manifest;

    expect(await principalFromStore(store, userId)).toEqual({
      id: userId,
      roles: ["field_tech", "office_admin"],
    });

    expect(jobManifest.rowScope).toBe("all");
    expect(jobManifest.fields.financial_terms).toEqual(["submit"]);
    expect(jobManifest.fields.assignments).toContain("write");
    expect(jobManifest.actions).toEqual(
      expect.arrayContaining(["delete", "restore"]),
    );

    expect(customerManifest.fields.profile).toEqual(["read", "write"]);
    expect(customerManifest.fields.billing).toEqual(["read", "write"]);
    expect(customerManifest.actions).toEqual(["read", "write"]);
  });

  it("changing roles in store without changing user id updates the next resolve (T3 simulate)", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const userId = "promoted-tech";
    store.setUserRoles(userId, ["field_tech"]);

    const before = (
      await resolveManifestFromStore(
        store,
        userId,
        { surface: "customer_detail", mode: "detail" },
        policy,
      )
    ).manifest;
    expect(before.fields.profile).toEqual([]);

    store.setUserRoles(userId, ["field_tech", "office_admin"]);

    const after = (
      await resolveManifestFromStore(
        store,
        userId,
        { surface: "customer_detail", mode: "detail" },
        policy,
      )
    ).manifest;
    expect(await principalFromStore(store, userId)).toEqual({
      id: userId,
      roles: ["field_tech", "office_admin"],
    });
    expect(after.fields.profile).toEqual(["read", "write"]);
    expect(after.rowScope).toBe("all");
  });

  it("getPrincipal loads DB roles from session without Auth.js HTTP", async () => {
    readProviderSession.mockResolvedValue({
      userId: SEED_TECH_ID,
      label: "tech@demo.local",
    });

    const principal = await getPrincipal();
    const manifest = policy.resolve(principal, {
      surface: "job_detail",
      mode: "detail",
    });

    expect(principal).toEqual({ id: SEED_TECH_ID, roles: ["field_tech"] });
    expect(manifest.fields.financial_terms).toEqual(["submit"]);
    expect(manifest.fields.customer_ref).toEqual([]);
  });
});
