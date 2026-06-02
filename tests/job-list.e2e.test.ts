import { afterEach, describe, expect, it } from "vitest";

import { createMemoryPendingStore } from "@latch/approval";
import { createMemoryAuditWriter, setAuditWriter } from "@latch/audit";
import { ValidationError, type PermissionContext } from "@latch/contracts";
import {
  createJobsDal,
  MemoryJobStore,
  SEED_ADMIN_ID,
  SEED_JOB_OTHER,
  SEED_JOB_OWNED,
  SEED_TECH_ID,
  seedPilotJobs,
} from "@latch/dal";
import { PolicyService } from "@latch/policy";

const policy = new PolicyService();

const buildListCtx = (userId: string, roles: string[]): PermissionContext => {
  const principal = { id: userId, roles };
  const manifest = policy.resolve(principal, {
    surface: "job_list",
    mode: "list",
  });
  return { principal, manifest, surface: "job_list" };
};

const BULK_TARGET_TECH = "seed-bulk-target-tech";

const audit = createMemoryAuditWriter();

afterEach(() => {
  audit.reset();
  setAuditWriter(null);
});

/** Add `count` admin-scoped jobs on top of the pilot seed; returns their ids. */
const seedBulkJobs = (store: MemoryJobStore, count: number): string[] => {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `seed-bulk-job-${i}`;
    ids.push(id);
    store.upsertJob({
      id,
      title: `Bulk job ${i}`,
      status: "scheduled",
      scheduledAt: new Date("2026-05-01T12:00:00.000Z"),
      contractAmount: "1000.00",
      customerName: "Bulk Co",
      siteLabel: `Site ${i}`,
    });
    store.addAssignment({ jobId: id, userId: SEED_ADMIN_ID });
  }
  return ids;
};

describe("job_list — policy → DAL → list DTO (e2e)", () => {
  it("S1 tech list: row scope limited to assignment; DTOs omit financial_terms", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());

    const ctx = buildListCtx(SEED_TECH_ID, ["field_tech"]);
    expect(ctx.manifest.rowScope).toBe("own");

    const { rows, total } = dal.list(ctx);

    expect(total).toBe(1);
    expect(rows.map((r) => r.id)).toEqual([SEED_JOB_OWNED]);
    expect(rows[0]?.summary?.title).toContain("Panel upgrade");
    for (const row of rows) {
      expect(row).not.toHaveProperty("financial_terms");
    }
  });

  it("S1 admin list: all rows in scope; financial_terms present where granted", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());

    const ctx = buildListCtx(SEED_ADMIN_ID, ["office_admin"]);
    expect(ctx.manifest.rowScope).toBe("all");

    const { rows, total } = dal.list(ctx);

    expect(total).toBe(2);
    expect(rows.map((r) => r.id).sort()).toEqual(
      [SEED_JOB_OTHER, SEED_JOB_OWNED].sort(),
    );

    const owned = rows.find((r) => r.id === SEED_JOB_OWNED);
    expect(owned?.financial_terms?.contract_amount).toBe("12500.00");
  });
});

describe("job_list — bulk update partial success (e2e, S2)", () => {
  it("partial: 20 ids with 5 out of scope → 15 succeeded, 5 skipped", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    store.upsertUser({ id: BULK_TARGET_TECH, displayName: "Bulk target tech" });
    const jobIds = seedBulkJobs(store, 15);
    const dal = createJobsDal(store, createMemoryPendingStore());
    const ctx = buildListCtx(SEED_ADMIN_ID, ["office_admin"]);

    const ids = [
      ...jobIds,
      "missing-0",
      "missing-1",
      "missing-2",
      "missing-3",
      "missing-4",
    ];
    expect(ids).toHaveLength(20);

    const result = await dal.bulkUpdate(
      ctx,
      ids,
      { assignments: [{ user_id: BULK_TARGET_TECH }] },
      { mode: "partial", requestId: "e2e-bulk-1" },
    );

    expect(result.succeeded).toHaveLength(15);
    expect(result.skipped).toHaveLength(5);
    expect(result.skipped.every((s) => s.reason === "not_found")).toBe(true);
    expect(result.failed).toHaveLength(0);

    for (const id of jobIds) {
      const assignees = store.getAssignmentsForJob(id).map((a) => a.userId);
      expect(assignees).toEqual([BULK_TARGET_TECH]);
    }
  });

  it("all_or_nothing: any out-of-scope id → no successful writes", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    store.upsertUser({ id: BULK_TARGET_TECH, displayName: "Bulk target tech" });
    const jobIds = seedBulkJobs(store, 15);
    const dal = createJobsDal(store, createMemoryPendingStore());
    const ctx = buildListCtx(SEED_ADMIN_ID, ["office_admin"]);

    const before = jobIds.map((id) =>
      store.getAssignmentsForJob(id).map((a) => a.userId),
    );

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
      { assignments: [{ user_id: BULK_TARGET_TECH }] },
      { mode: "all_or_nothing" },
    );

    expect(result.succeeded).toHaveLength(0);
    expect(result.skipped).toHaveLength(5);
    expect(result.skipped.every((s) => s.reason === "not_found")).toBe(true);

    for (let i = 0; i < jobIds.length; i++) {
      const assignees = store
        .getAssignmentsForJob(jobIds[i]!)
        .map((a) => a.userId);
      expect(assignees).toEqual(before[i]);
    }
  });

  it("strict bulk patch: unknown key rejected with ValidationError, no rows touched", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    store.upsertUser({ id: BULK_TARGET_TECH, displayName: "Bulk target tech" });
    const jobIds = seedBulkJobs(store, 3);
    const dal = createJobsDal(store, createMemoryPendingStore());
    const ctx = buildListCtx(SEED_ADMIN_ID, ["office_admin"]);

    const before = jobIds.map((id) =>
      store.getAssignmentsForJob(id).map((a) => a.userId),
    );

    await expect(
      dal.bulkUpdate(ctx, jobIds, {
        assignments: [{ user_id: BULK_TARGET_TECH }],
        evil: true,
      }),
    ).rejects.toThrow(ValidationError);

    for (let i = 0; i < jobIds.length; i++) {
      const assignees = store
        .getAssignmentsForJob(jobIds[i]!)
        .map((a) => a.userId);
      expect(assignees).toEqual(before[i]);
    }
  });
});
