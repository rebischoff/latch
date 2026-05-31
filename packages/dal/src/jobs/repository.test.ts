import { afterEach, describe, expect, it } from "vitest";

import {
  createMemoryAuditWriter,
  setAuditWriter,
} from "@latch/audit";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  type PermissionContext,
} from "@latch/contracts";
import { PolicyService } from "@latch/policy";

import { createMemoryPendingStore } from "@latch/approval";

import { createJobsDal } from "./repository.js";
import { MemoryJobStore } from "./memory-store.js";
import {
  SEED_ADMIN_ID,
  SEED_JOB_OTHER,
  SEED_JOB_OWNED,
  SEED_TECH_ID,
  seedPilotJobs,
} from "../seed.js";

const buildCtx = (
  userId: string,
  roles: string[],
  entityId?: string,
): PermissionContext => {
  const policy = new PolicyService();
  const principal = { id: userId, roles };
  const manifest = policy.resolve(principal, {
    surface: "job_detail",
    entityId,
    mode: "detail",
  });
  return { principal, manifest, surface: "job_detail" };
};

const audit = createMemoryAuditWriter();

const createDal = (store: MemoryJobStore) =>
  createJobsDal(store, createMemoryPendingStore());

afterEach(() => {
  audit.reset();
  setAuditWriter(null);
});

describe("DAL contract tests", () => {
  it("field_tech DTO omits forbidden financial_terms (no null placeholder)", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);

    const dto = dal.get(buildCtx(SEED_TECH_ID, ["field_tech"]), SEED_JOB_OWNED);

    expect(dto.id).toBe(SEED_JOB_OWNED);
    expect(dto.summary?.title).toContain("Panel upgrade");
    expect(dto).not.toHaveProperty("financial_terms");
  });

  it("strict PATCH rejects unknown keys with ValidationError", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);
    const ctx = buildCtx(SEED_TECH_ID, ["field_tech"]);

    await expect(
      dal.patch(ctx, SEED_JOB_OWNED, {
        summary: { title: "Ok" },
        evil: true,
      }),
    ).rejects.toThrow(ValidationError);

    expect(audit.entries).toHaveLength(0);
  });

  it("cross-principal read throws NotFoundError (S4 existence hiding)", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);

    expect(() =>
      dal.get(buildCtx(SEED_TECH_ID, ["field_tech"]), SEED_JOB_OTHER),
    ).toThrow(NotFoundError);
  });
});

describe("createJobsDal.get", () => {
  it("office_admin: same job includes financial_terms.contract_amount", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);

    const dto = dal.get(
      buildCtx(SEED_ADMIN_ID, ["office_admin"]),
      SEED_JOB_OWNED,
    );

    expect(dto.financial_terms?.contract_amount).toBe("12500.00");
  });
});

describe("createJobsDal.patch", () => {
  it("field_tech: can patch summary.title on owned job and records audit", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);
    const ctx = buildCtx(SEED_TECH_ID, ["field_tech"]);

    const dto = await dal.patch(ctx, SEED_JOB_OWNED, {
      summary: { title: "Panel upgrade — updated" },
    });

    expect(dto.summary?.title).toBe("Panel upgrade — updated");
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      actorId: SEED_TECH_ID,
      action: "update",
      tableName: "jobs",
      recordId: SEED_JOB_OWNED,
      moduleId: "job_detail",
      fieldIds: ["summary"],
    });
    expect(audit.entries[0]?.before).toMatchObject({
      title: "Panel upgrade — 123 Main St",
    });
    expect(audit.entries[0]?.after).toMatchObject({
      title: "Panel upgrade — updated",
    });
  });

  it("field_tech: PATCH financial_terms creates pending; live row unchanged (S3)", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const pendingStore = createMemoryPendingStore();
    const dal = createJobsDal(store, pendingStore);
    const ctx = buildCtx(SEED_TECH_ID, ["field_tech"]);

    const dto = await dal.patch(ctx, SEED_JOB_OWNED, {
      financial_terms: { contract_amount: "99999.00" },
    });

    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("12500.00");
    expect(dto).not.toHaveProperty("financial_terms");

    const pending = pendingStore.getPendingForEntity(SEED_JOB_OWNED, {
      surfaceId: "job_detail",
      status: "submitted",
    });
    expect(pending).toHaveLength(1);
    expect(pending[0]?.patch).toEqual({
      financial_terms: { contract_amount: "99999.00" },
    });
    expect(pending[0]?.submittedBy).toBe(SEED_TECH_ID);
    expect(audit.entries).toHaveLength(0);
  });

  it("office_admin: acceptPending applies contract_amount and audit approve", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const pendingStore = createMemoryPendingStore();
    const dal = createJobsDal(store, pendingStore);

    const techCtx = buildCtx(SEED_TECH_ID, ["field_tech"]);
    await dal.patch(techCtx, SEED_JOB_OWNED, {
      financial_terms: { contract_amount: "18750.00" },
    });

    const pending = pendingStore.getPendingForEntity(SEED_JOB_OWNED, {
      status: "submitted",
    });
    expect(pending).toHaveLength(1);

    const adminCtx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);
    const dto = await dal.acceptPending(adminCtx, pending[0]!.id);

    expect(dto.financial_terms?.contract_amount).toBe("18750.00");
    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("18750.00");
    expect(pendingStore.getById(pending[0]!.id)?.status).toBe("accepted");

    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      actorId: SEED_ADMIN_ID,
      action: "approve",
      tableName: "jobs",
      recordId: SEED_JOB_OWNED,
      moduleId: "job_detail",
      fieldIds: ["financial_terms"],
      approvalId: pending[0]!.id,
    });
    expect(audit.entries[0]?.before).toMatchObject({
      contract_amount: "12500.00",
    });
    expect(audit.entries[0]?.after).toMatchObject({
      contract_amount: "18750.00",
    });
  });

  it("field_tech: patch on another user's job throws NotFoundError", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);

    await expect(
      dal.patch(buildCtx(SEED_TECH_ID, ["field_tech"]), SEED_JOB_OTHER, {
        summary: { title: "Nope" },
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("createJobsDal.delete", () => {
  it("office_admin: hard-deletes job; get returns NotFoundError; audit recorded", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);
    const ctx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);

    await dal.delete(ctx, SEED_JOB_OWNED);

    expect(store.getJob(SEED_JOB_OWNED)).toBeUndefined();

    expect(() => dal.get(ctx, SEED_JOB_OWNED)).toThrow(NotFoundError);

    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      actorId: SEED_ADMIN_ID,
      action: "delete",
      tableName: "jobs",
      recordId: SEED_JOB_OWNED,
      moduleId: "job_detail",
      fieldIds: ["summary"],
      after: null,
    });
    expect(audit.entries[0]?.before).toMatchObject({
      title: "Panel upgrade — 123 Main St",
    });
  });

  it("field_tech: delete throws ForbiddenError", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);
    const ctx = buildCtx(SEED_TECH_ID, ["field_tech"]);

    await expect(dal.delete(ctx, SEED_JOB_OWNED)).rejects.toThrow(
      ForbiddenError,
    );

    expect(store.getJob(SEED_JOB_OWNED)).toBeDefined();
    expect(audit.entries).toHaveLength(0);
  });
});
