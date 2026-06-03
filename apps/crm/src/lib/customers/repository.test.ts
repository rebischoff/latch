import { afterEach, describe, expect, it } from "vitest";

import {
  createMemoryAuditWriter,
  setAuditWriter,
} from "@latch/audit";
import {
  NotFoundError,
  ValidationError,
  type PermissionContext,
} from "@latch/contracts";
import { PolicyService } from "@latch/policy";

import { MemoryJobStore } from "../../../db/memory-store.js";
import {
  SEED_ADMIN_ID,
  SEED_CUSTOMER_ACME,
  SEED_CUSTOMER_OAK,
  SEED_JOB_OWNED,
  SEED_JOB_OTHER,
  SEED_TECH_ID,
  seedPilotJobs,
} from "../../../db/seed.js";
import { jobPolicyRegistry } from "../policy/registry.js";
import { createCustomersDal } from "./repository.js";

const policy = new PolicyService({ registry: jobPolicyRegistry });
const audit = createMemoryAuditWriter();

afterEach(() => {
  audit.reset();
  setAuditWriter(null);
});

const buildCtx = (
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

describe("customer_detail DAL get", () => {
  it("office_admin get returns all four Fields when granted", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createCustomersDal(store);

    const dto = dal.get(
      buildCtx(SEED_ADMIN_ID, ["office_admin"]),
      SEED_CUSTOMER_ACME,
    );

    expect(dto.id).toBe(SEED_CUSTOMER_ACME);
    expect(dto.profile).toEqual({
      name: "Acme Electric",
      phone: "555-0100",
    });
    expect(dto.billing?.billing_notes).toContain("Net 30");
    expect(dto.sites).toEqual([{ label: "123 Main St" }]);
    expect(dto.job_history).toEqual([
      {
        id: SEED_JOB_OWNED,
        title: "Panel upgrade — 123 Main St",
        status: "scheduled",
      },
    ]);
  });

  it("field_tech with no Surface binding throws NotFoundError (404 hide)", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createCustomersDal(store);

    expect(() =>
      dal.get(buildCtx(SEED_TECH_ID, ["field_tech"]), SEED_CUSTOMER_ACME),
    ).toThrow(NotFoundError);
  });

  it("DTO omits Fields without read (property absence, not null)", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createCustomersDal(store);

    const ctx: PermissionContext = {
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

    const dto = dal.get(ctx, SEED_CUSTOMER_ACME);

    expect(dto.profile).toBeDefined();
    expect(dto).not.toHaveProperty("billing");
  });

  it("job_history returns jobs linked by customer_id for seed customers", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createCustomersDal(store);
    const ctx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);

    const acme = dal.get(ctx, SEED_CUSTOMER_ACME);
    expect(acme.job_history?.map((j) => j.id)).toEqual([SEED_JOB_OWNED]);

    const oak = dal.get(ctx, SEED_CUSTOMER_OAK);
    expect(oak.job_history?.map((j) => j.id)).toEqual([SEED_JOB_OTHER]);
  });

  it("missing customer id throws NotFoundError", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createCustomersDal(store);

    expect(() =>
      dal.get(buildCtx(SEED_ADMIN_ID, ["office_admin"]), "missing-customer"),
    ).toThrow(NotFoundError);
  });
});

describe("customer_detail DAL patch", () => {
  it("office_admin patch on profile persists; reload via get shows new values", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createCustomersDal(store);
    const ctx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);

    const patched = await dal.patch(ctx, SEED_CUSTOMER_ACME, {
      profile: { name: "Acme Electric — updated", phone: "555-0199" },
    });

    expect(patched.profile?.name).toBe("Acme Electric — updated");
    expect(patched.profile?.phone).toBe("555-0199");

    const reloaded = dal.get(ctx, SEED_CUSTOMER_ACME);
    expect(reloaded.profile).toEqual({
      name: "Acme Electric — updated",
      phone: "555-0199",
    });
  });

  it("patch with unknown key throws ValidationError and touches no rows", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createCustomersDal(store);
    const ctx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);
    const before = store.getCustomer(SEED_CUSTOMER_ACME);

    await expect(
      dal.patch(ctx, SEED_CUSTOMER_ACME, {
        profile: { name: "Should not apply" },
        evil: true,
      }),
    ).rejects.toThrow(ValidationError);

    expect(store.getCustomer(SEED_CUSTOMER_ACME)).toEqual(before);
    expect(audit.entries).toHaveLength(0);
  });

  it("field_tech patch attempt throws NotFoundError (no existence leak)", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createCustomersDal(store);

    await expect(
      dal.patch(buildCtx(SEED_TECH_ID, ["field_tech"]), SEED_CUSTOMER_ACME, {
        profile: { name: "Nope" },
      }),
    ).rejects.toThrow(NotFoundError);

    expect(store.getCustomer(SEED_CUSTOMER_ACME)?.name).toBe("Acme Electric");
    expect(audit.entries).toHaveLength(0);
  });

  it("patch targeting job_history in body is rejected (not writable)", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createCustomersDal(store);
    const ctx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);
    const before = store.getCustomer(SEED_CUSTOMER_ACME);

    await expect(
      dal.patch(ctx, SEED_CUSTOMER_ACME, {
        job_history: [{ id: "fake", title: "x", status: "open" }],
      }),
    ).rejects.toThrow(ValidationError);

    expect(store.getCustomer(SEED_CUSTOMER_ACME)).toEqual(before);
    expect(audit.entries).toHaveLength(0);
  });

  it("successful admin patch writes audit row with changed Field ids", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createCustomersDal(store);
    const ctx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);

    await dal.patch(ctx, SEED_CUSTOMER_ACME, {
      profile: { name: "Acme — audited" },
    });

    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      actorId: SEED_ADMIN_ID,
      action: "update",
      tableName: "customers",
      recordId: SEED_CUSTOMER_ACME,
      moduleId: "customer_detail",
      fieldIds: ["profile"],
    });
    expect(audit.entries[0]?.before).toMatchObject({ name: "Acme Electric" });
    expect(audit.entries[0]?.after).toMatchObject({ name: "Acme — audited" });
  });

  it("sites patch replaces child rows", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createCustomersDal(store);
    const ctx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);

    const dto = await dal.patch(ctx, SEED_CUSTOMER_ACME, {
      sites: [{ label: "999 New St" }, { label: "Annex" }],
    });

    expect(dto.sites).toEqual([{ label: "999 New St" }, { label: "Annex" }]);
    expect(store.getSitesForCustomer(SEED_CUSTOMER_ACME).map((s) => s.label)).toEqual(
      ["999 New St", "Annex"],
    );
  });
});
