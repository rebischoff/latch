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
import { createMemoryPendingStore } from "@latch/approval";

import { MemoryJobStore } from "../../../db/memory-store.js";
import {
  SEED_ADMIN_ID,
  SEED_CUSTOMER_ACME,
  SEED_JOB_OTHER,
  SEED_JOB_OWNED,
  SEED_TECH_ID,
  seedPilotJobs,
} from "../../../db/seed.js";
import { jobPolicyRegistry } from "../policy/registry.js";
import { PolicyService } from "@latch/policy";
import { createJobsDal } from "./repository.js";

const policy = new PolicyService({ registry: jobPolicyRegistry });

const buildCtx = (
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

const buildListCtx = (userId: string, roles: string[]): PermissionContext => {
  const principal = { id: userId, roles };
  const manifest = policy.resolve(principal, {
    surface: "job_list",
    mode: "list",
  });
  return { principal, manifest, surface: "job_list" };
};

/** Synthetic ctx: rowScope own + assignments write (T15 row-filter partial bulk). */
const buildOwnScopeBulkWriteCtx = (userId: string): PermissionContext => ({
  principal: { id: userId, roles: ["field_tech"] },
  surface: "job_list",
  manifest: {
    surface: "job_list",
    actions: ["read", "write"],
    rowScope: "own",
    fields: {
      summary: ["read"],
      customer_site: ["read"],
      assignments: ["read", "write"],
    },
  },
});

/** Synthetic ctx: rowScope own + delete (T15 row-filter partial bulk delete). */
const buildOwnScopeBulkDeleteCtx = (userId: string): PermissionContext => ({
  principal: { id: userId, roles: ["field_tech"] },
  surface: "job_list",
  manifest: {
    surface: "job_list",
    actions: ["read", "delete"],
    rowScope: "own",
    fields: {
      summary: ["read"],
      customer_site: ["read"],
      assignments: ["read"],
    },
  },
});

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

describe("createJobsDal.get — customer_ref", () => {
  it("office_admin: includes customer_ref when granted", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);

    const dto = dal.get(
      buildCtx(SEED_ADMIN_ID, ["office_admin"]),
      SEED_JOB_OWNED,
    );

    expect(dto.customer_ref).toEqual({
      id: SEED_CUSTOMER_ACME,
      name: "Acme Electric",
    });
  });

  it("field_tech: omits customer_ref (property absence, not null)", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);

    const dto = dal.get(buildCtx(SEED_TECH_ID, ["field_tech"]), SEED_JOB_OWNED);

    expect(dto.summary?.title).toContain("Panel upgrade");
    expect(dto).not.toHaveProperty("customer_ref");
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

    const pending = await pendingStore.getPendingForEntity(SEED_JOB_OWNED, {
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

    const pending = await pendingStore.getPendingForEntity(SEED_JOB_OWNED, {
      status: "submitted",
    });
    expect(pending).toHaveLength(1);

    const adminCtx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);
    const dto = await dal.acceptPending(adminCtx, pending[0]!.id);

    expect(dto.financial_terms?.contract_amount).toBe("18750.00");
    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("18750.00");
    expect((await pendingStore.getById(pending[0]!.id))?.status).toBe("accepted");

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

  it("office_admin: rejectPending leaves contract_amount unchanged and audit reject", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const pendingStore = createMemoryPendingStore();
    const dal = createJobsDal(store, pendingStore);

    const techCtx = buildCtx(SEED_TECH_ID, ["field_tech"]);
    await dal.patch(techCtx, SEED_JOB_OWNED, {
      financial_terms: { contract_amount: "99999.00" },
    });

    const pending = await pendingStore.getPendingForEntity(SEED_JOB_OWNED, {
      status: "submitted",
    });
    expect(pending).toHaveLength(1);

    const adminCtx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);
    await dal.rejectPending(adminCtx, pending[0]!.id, {
      comment: "Amount not approved",
    });

    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("12500.00");
    expect((await pendingStore.getById(pending[0]!.id))?.status).toBe("rejected");
    expect((await pendingStore.getById(pending[0]!.id))?.comment).toBe(
      "Amount not approved",
    );

    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      actorId: SEED_ADMIN_ID,
      action: "reject",
      tableName: "jobs",
      recordId: SEED_JOB_OWNED,
      moduleId: "job_detail",
      fieldIds: ["financial_terms"],
      approvalId: pending[0]!.id,
      patch: { financial_terms: { contract_amount: "99999.00" } },
    });
  });

  it("field_tech: withdrawPending allows a new submit after withdraw", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const pendingStore = createMemoryPendingStore();
    const dal = createJobsDal(store, pendingStore);
    const techCtx = buildCtx(SEED_TECH_ID, ["field_tech"]);

    await dal.patch(techCtx, SEED_JOB_OWNED, {
      financial_terms: { contract_amount: "15000.00" },
    });

    const first = await pendingStore.getPendingForEntity(SEED_JOB_OWNED, {
      status: "submitted",
    });
    await dal.withdrawPending(techCtx, first[0]!.id);

    expect((await pendingStore.getById(first[0]!.id))?.status).toBe("withdrawn");
    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("12500.00");
    expect(audit.entries).toHaveLength(0);

    await dal.patch(techCtx, SEED_JOB_OWNED, {
      financial_terms: { contract_amount: "16000.00" },
    });

    const open = await pendingStore.getPendingForEntity(SEED_JOB_OWNED, {
      status: "submitted",
    });
    expect(open).toHaveLength(1);
    expect(open[0]?.id).not.toBe(first[0]!.id);
    expect(open[0]?.patch).toEqual({
      financial_terms: { contract_amount: "16000.00" },
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

describe("createJobsDal.list", () => {
  it("field_tech: rows only for assigned jobs; no financial_terms key", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);

    const { rows } = dal.list(buildListCtx(SEED_TECH_ID, ["field_tech"]));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(SEED_JOB_OWNED);
    expect(rows[0]?.summary?.title).toContain("Panel upgrade");
    expect(rows[0]).not.toHaveProperty("financial_terms");
    for (const row of rows) {
      expect(row).not.toHaveProperty("financial_terms");
    }
  });

  it("office_admin: all jobs in scope with financial_terms when granted", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);

    const { rows, total } = dal.list(
      buildListCtx(SEED_ADMIN_ID, ["office_admin"]),
    );

    expect(total).toBe(2);
    expect(rows).toHaveLength(2);
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual([SEED_JOB_OTHER, SEED_JOB_OWNED].sort());

    const owned = rows.find((r) => r.id === SEED_JOB_OWNED);
    expect(owned?.financial_terms?.contract_amount).toBe("12500.00");
  });

  it("field_tech with no assignments returns empty array", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);

    const { rows, total } = dal.list(
      buildListCtx("seed-unassigned-tech", ["field_tech"]),
    );

    expect(rows).toEqual([]);
    expect(total).toBe(0);
  });

  it("rejects limit above listMaxPageSize with ValidationError", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);

    expect(() =>
      dal.list(buildListCtx(SEED_ADMIN_ID, ["office_admin"]), { limit: 201 }),
    ).toThrow(ValidationError);
  });

  it("filters by status when opts.status is set", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);

    const { rows } = dal.list(buildListCtx(SEED_ADMIN_ID, ["office_admin"]), {
      status: "scheduled",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(SEED_JOB_OWNED);
  });
});

const NEW_TECH_ID = "seed-bulk-target-tech";

const seedBulkJobs = (
  store: MemoryJobStore,
  count: number,
  prefix = "seed-bulk-job",
): string[] => {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `${prefix}-${i}`;
    ids.push(id);
    store.upsertJob({
      id,
      title: `Bulk job ${i}`,
      status: "scheduled",
      scheduledAt: new Date("2026-05-01T12:00:00.000Z"),
      contractAmount: "1000.00",
      customerId: SEED_CUSTOMER_ACME,
    });
    store.addAssignment({ jobId: id, userId: SEED_ADMIN_ID });
  }
  return ids;
};

describe("createJobsDal.bulkUpdate", () => {
  it("office_admin: partial mode — 15 succeeded, 5 not_found skipped; assignments updated", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    store.upsertUser({ id: NEW_TECH_ID, displayName: "Bulk target tech" });
    const jobIds = seedBulkJobs(store, 15);
    const dal = createDal(store);
    const ctx = buildListCtx(SEED_ADMIN_ID, ["office_admin"]);

    const ids = [
      ...jobIds,
      "missing-0",
      "missing-1",
      "missing-2",
      "missing-3",
      "missing-4",
    ];

    const result = await dal.bulkUpdate(
      ctx,
      ids,
      { assignments: [{ user_id: NEW_TECH_ID }] },
      { mode: "partial", requestId: "req-bulk-1" },
    );

    expect(result.succeeded).toHaveLength(15);
    expect(result.skipped).toHaveLength(5);
    expect(result.skipped.every((s) => s.reason === "not_found")).toBe(true);
    expect(result.failed).toHaveLength(0);

    for (const id of jobIds) {
      const assignees = store.getAssignmentsForJob(id).map((a) => a.userId);
      expect(assignees).toEqual([NEW_TECH_ID]);
    }

    expect(audit.entries.filter((e) => e.action === "update")).toHaveLength(15);
    expect(audit.entries.some((e) => e.action === "bulk_summary")).toBe(true);
  });

  it("office_admin: all_or_nothing with any skip applies no changes", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    store.upsertUser({ id: NEW_TECH_ID, displayName: "Bulk target tech" });
    const jobIds = seedBulkJobs(store, 15);
    const dal = createDal(store);

    const before = jobIds.map((id) =>
      store.getAssignmentsForJob(id).map((a) => a.userId),
    );

    const result = await dal.bulkUpdate(
      buildListCtx(SEED_ADMIN_ID, ["office_admin"]),
      [...jobIds, "missing-0"],
      { assignments: [{ user_id: NEW_TECH_ID }] },
      { mode: "all_or_nothing" },
    );

    expect(result.succeeded).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toMatchObject({
      id: "missing-0",
      reason: "not_found",
    });

    for (let i = 0; i < jobIds.length; i++) {
      const assignees = store.getAssignmentsForJob(jobIds[i]!).map(
        (a) => a.userId,
      );
      expect(assignees).toEqual(before[i]);
    }

    expect(audit.entries).toHaveLength(0);
  });

  it("rejects unknown patch keys with ValidationError and touches no rows", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const jobIds = seedBulkJobs(store, 3);
    const dal = createDal(store);
    const ctx = buildListCtx(SEED_ADMIN_ID, ["office_admin"]);

    const before = jobIds.map((id) =>
      store.getAssignmentsForJob(id).map((a) => a.userId),
    );

    await expect(
      dal.bulkUpdate(ctx, jobIds, {
        assignments: [{ user_id: NEW_TECH_ID }],
        evil: true,
      }),
    ).rejects.toThrow(ValidationError);

    for (let i = 0; i < jobIds.length; i++) {
      const assignees = store.getAssignmentsForJob(jobIds[i]!).map(
        (a) => a.userId,
      );
      expect(assignees).toEqual(before[i]);
    }

    expect(audit.entries).toHaveLength(0);
  });

  it("rejects batch larger than bulkMaxBatch", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);
    const ctx = buildListCtx(SEED_ADMIN_ID, ["office_admin"]);
    const ids = Array.from({ length: 501 }, (_, i) => `id-${i}`);

    await expect(
      dal.bulkUpdate(ctx, ids, {
        assignments: [{ user_id: NEW_TECH_ID }],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("own scope: partial mode — permitted + forbidden row ids; DB consistent (T15)", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    store.upsertUser({ id: NEW_TECH_ID, displayName: "Bulk target tech" });
    const dal = createDal(store);
    const ctx = buildOwnScopeBulkWriteCtx(SEED_TECH_ID);

    const beforeOtherAssignees = store
      .getAssignmentsForJob(SEED_JOB_OTHER)
      .map((a) => a.userId);

    const result = await dal.bulkUpdate(
      ctx,
      [SEED_JOB_OWNED, SEED_JOB_OTHER],
      { assignments: [{ user_id: NEW_TECH_ID }] },
      { mode: "partial" },
    );

    expect(result.succeeded).toEqual([SEED_JOB_OWNED]);
    expect(result.skipped).toEqual([
      { id: SEED_JOB_OTHER, reason: "not_found" },
    ]);

    expect(store.getAssignmentsForJob(SEED_JOB_OWNED).map((a) => a.userId)).toEqual(
      [NEW_TECH_ID],
    );
    expect(store.getAssignmentsForJob(SEED_JOB_OTHER).map((a) => a.userId)).toEqual(
      beforeOtherAssignees,
    );

    expect(audit.entries.filter((e) => e.action === "update")).toHaveLength(1);
  });

  it("field_tech: bulk financial_terms → per-row pending, shared batch_id; live unchanged", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const pendingStore = createMemoryPendingStore();
    const jobIds = seedBulkJobs(store, 2);
    for (const id of jobIds) {
      store.addAssignment({ jobId: id, userId: SEED_TECH_ID });
    }
    const dal = createJobsDal(store, pendingStore);
    const ctx = buildListCtx(SEED_TECH_ID, ["field_tech"]);

    const result = await dal.bulkUpdate(ctx, jobIds, {
      financial_terms: { contract_amount: "22000.00" },
    });

    expect(result.succeeded).toEqual(jobIds);
    expect(result.skipped).toHaveLength(0);

    for (const id of jobIds) {
      expect(store.getJob(id)?.contractAmount).toBe("1000.00");
      const pending = await pendingStore.getPendingForEntity(id, {
        surfaceId: "job_list",
        status: "submitted",
      });
      expect(pending).toHaveLength(1);
      expect(pending[0]?.patch).toEqual({
        financial_terms: { contract_amount: "22000.00" },
      });
      expect(pending[0]?.batchId).toBeDefined();
    }

    const batchIds = new Set(
      (
        await Promise.all(
          jobIds.map((id) =>
            pendingStore.getPendingForEntity(id, {
              surfaceId: "job_list",
              status: "submitted",
            }),
          ),
        )
      )
        .flat()
        .map((p) => p.batchId),
    );
    expect(batchIds.size).toBe(1);
    expect(audit.entries).toHaveLength(0);
  });

  it("field_tech: bulk financial skips row with open pending (forbidden_row)", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const pendingStore = createMemoryPendingStore();
    const dal = createJobsDal(store, pendingStore);
    const ctx = buildListCtx(SEED_TECH_ID, ["field_tech"]);

    await pendingStore.submit({
      surfaceId: "job_list",
      entityId: SEED_JOB_OWNED,
      fieldIds: ["financial_terms"],
      patch: { financial_terms: { contract_amount: "15000.00" } },
      submittedBy: SEED_TECH_ID,
    });

    const result = await dal.bulkUpdate(ctx, [SEED_JOB_OWNED, SEED_JOB_OTHER], {
      financial_terms: { contract_amount: "30000.00" },
    });

    expect(result.succeeded).toHaveLength(0);
    expect(result.skipped).toContainEqual({
      id: SEED_JOB_OWNED,
      reason: "forbidden_row",
    });
    expect(result.skipped).toContainEqual({
      id: SEED_JOB_OTHER,
      reason: "not_found",
    });
  });

  it("forbidden_field when patch Field is submit-only (not write)", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);
    const ctx: PermissionContext = {
      principal: { id: SEED_ADMIN_ID, roles: ["office_admin"] },
      surface: "job_list",
      manifest: {
        surface: "job_list",
        actions: ["read"],
        rowScope: "all",
        fields: {
          assignments: ["read", "submit"],
        },
      },
    };

    const result = await dal.bulkUpdate(
      ctx,
      [SEED_JOB_OWNED],
      { assignments: [{ user_id: NEW_TECH_ID }] },
      { mode: "partial" },
    );

    expect(result.succeeded).toHaveLength(0);
    expect(result.skipped).toEqual([
      {
        id: SEED_JOB_OWNED,
        reason: "forbidden_field",
        detail: { fields: ["assignments"] },
      },
    ]);
    expect(
      store.getAssignmentsForJob(SEED_JOB_OWNED).some(
        (a) => a.userId === SEED_TECH_ID,
      ),
    ).toBe(true);
    expect(audit.entries).toHaveLength(0);
  });
});

describe("createJobsDal.bulkDelete", () => {
  it("office_admin: partial mode deletes visible jobs; audit per row; absent from list", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const jobIds = seedBulkJobs(store, 10);
    const dal = createDal(store);
    const ctx = buildListCtx(SEED_ADMIN_ID, ["office_admin"]);

    const ids = [...jobIds, "missing-0", "missing-1"];

    const result = await dal.bulkDelete(ctx, ids, {
      mode: "partial",
      requestId: "req-bulk-del-1",
    });

    expect(result.succeeded).toHaveLength(10);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped.every((s) => s.reason === "not_found")).toBe(true);
    expect(result.failed).toHaveLength(0);

    for (const id of jobIds) {
      expect(store.getJob(id)).toBeUndefined();
      expect(store.getAssignmentsForJob(id)).toHaveLength(0);
    }

    const { rows } = dal.list(ctx, { limit: 200 });
    for (const id of jobIds) {
      expect(rows.some((r) => r.id === id)).toBe(false);
    }

    expect(audit.entries.filter((e) => e.action === "delete")).toHaveLength(10);
    expect(audit.entries.some((e) => e.action === "bulk_summary")).toBe(true);
    for (const entry of audit.entries.filter((e) => e.action === "delete")) {
      expect(entry).toMatchObject({ after: null, fieldIds: ["summary"] });
    }
  });

  it("office_admin: all_or_nothing with any skip deletes no rows", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const jobIds = seedBulkJobs(store, 5);
    const dal = createDal(store);

    const result = await dal.bulkDelete(
      buildListCtx(SEED_ADMIN_ID, ["office_admin"]),
      [...jobIds, "missing-0"],
      { mode: "all_or_nothing" },
    );

    expect(result.succeeded).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toMatchObject({
      id: "missing-0",
      reason: "not_found",
    });

    for (const id of jobIds) {
      expect(store.getJob(id)).toBeDefined();
    }

    expect(audit.entries).toHaveLength(0);
  });

  it("rejects batch larger than bulkMaxBatch", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);
    const ctx = buildListCtx(SEED_ADMIN_ID, ["office_admin"]);
    const ids = Array.from({ length: 501 }, (_, i) => `id-${i}`);

    await expect(dal.bulkDelete(ctx, ids)).rejects.toThrow(ValidationError);
  });

  it("own scope: partial mode — deletes permitted row; forbidden id skipped (T15)", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createDal(store);
    const ctx = buildOwnScopeBulkDeleteCtx(SEED_TECH_ID);

    const result = await dal.bulkDelete(ctx, [SEED_JOB_OWNED, SEED_JOB_OTHER], {
      mode: "partial",
    });

    expect(result.succeeded).toEqual([SEED_JOB_OWNED]);
    expect(result.skipped).toEqual([
      { id: SEED_JOB_OTHER, reason: "not_found" },
    ]);

    expect(store.getJob(SEED_JOB_OWNED)).toBeUndefined();
    expect(store.getJob(SEED_JOB_OTHER)).toBeDefined();

    expect(audit.entries.filter((e) => e.action === "delete")).toHaveLength(1);
  });

  it("field_tech: bulkDelete throws ForbiddenError and touches no rows", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const jobIds = seedBulkJobs(store, 3);
    const dal = createDal(store);
    const ctx = buildListCtx(SEED_TECH_ID, ["field_tech"]);

    await expect(dal.bulkDelete(ctx, jobIds)).rejects.toThrow(ForbiddenError);

    for (const id of jobIds) {
      expect(store.getJob(id)).toBeDefined();
    }

    expect(audit.entries).toHaveLength(0);
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
      customer_id: SEED_CUSTOMER_ACME,
    });
    expect(
      (audit.entries[0]?.before as { assignments?: unknown[] })?.assignments,
    ).toEqual([{ job_id: SEED_JOB_OWNED, user_id: SEED_TECH_ID }]);
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
