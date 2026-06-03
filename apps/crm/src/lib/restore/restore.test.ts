import { afterEach, describe, expect, it } from "vitest";

import {
  createMemoryAuditWriter,
  restoreFromAuditEntry,
  setAuditWriter,
  type StoredAuditEntry,
} from "@latch/audit";
import { ConflictError, ForbiddenError } from "@latch/contracts";

import { MemoryJobStore } from "../../../db/memory-store.js";
import {
  SEED_ADMIN_ID,
  SEED_JOB_OWNED,
  SEED_TECH_ID,
  seedPilotJobs,
} from "../../../db/seed.js";
import { resolveManifestFromStore } from "../../../test-utils/index.js";
import { createJobsDal } from "../jobs/repository.js";
import { createMemoryPendingStore } from "@latch/approval";

import { createCrmRestoreDeps } from "./replay.js";

describe("CRM restore-from-audit (jobs)", () => {
  const audit = createMemoryAuditWriter();
  const catalog = new Map<string, StoredAuditEntry>();

  afterEach(() => {
    audit.reset();
    catalog.clear();
    setAuditWriter(null);
  });

  it("delete job → restore by audit id → job + assignments back; second restore 409", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());
    const { principal, manifest } = await resolveManifestFromStore(
      store,
      SEED_ADMIN_ID,
      { surface: "job_detail", entityId: SEED_JOB_OWNED, mode: "detail" },
    );
    const ctx = {
      principal,
      manifest,
      surface: "job_detail" as const,
    };

    await dal.delete(ctx, SEED_JOB_OWNED);
    expect(store.getJob(SEED_JOB_OWNED)).toBeUndefined();

    const deleteAudit = audit.entries[0];
    expect(deleteAudit?.action).toBe("delete");
    catalog.set("1", { id: "1", ...deleteAudit! });

    const resolved = await resolveManifestFromStore(store, SEED_ADMIN_ID, {
      surface: "job_detail",
      entityId: SEED_JOB_OWNED,
      mode: "detail",
    });
    const restoreCtx = { ...resolved, surface: "job_detail" as const };
    await restoreFromAuditEntry("1", restoreCtx, {
      getAuditEntry: (id) => catalog.get(id) ?? null,
      ...createCrmRestoreDeps(store),
    });

    expect(store.getJob(SEED_JOB_OWNED)?.title).toBe(
      "Panel upgrade — 123 Main St",
    );
    expect(store.getAssignmentsForJob(SEED_JOB_OWNED)).toEqual([
      { jobId: SEED_JOB_OWNED, userId: SEED_TECH_ID },
    ]);
    expect(audit.entries.some((e) => e.action === "restore")).toBe(true);

    await expect(
      restoreFromAuditEntry("1", restoreCtx, {
        getAuditEntry: (id) => catalog.get(id) ?? null,
        ...createCrmRestoreDeps(store),
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("field_tech without restore → ForbiddenError", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    catalog.set("1", {
      id: "1",
      actorId: SEED_ADMIN_ID,
      action: "delete",
      tableName: "jobs",
      recordId: SEED_JOB_OWNED,
      moduleId: "job_detail",
      before: { title: "x", customer_id: "c" },
      after: null,
    });

    const techResolved = await resolveManifestFromStore(store, SEED_TECH_ID, {
      surface: "job_detail",
      entityId: SEED_JOB_OWNED,
      mode: "detail",
    });
    const techCtx = { ...techResolved, surface: "job_detail" as const };

    await expect(
      restoreFromAuditEntry("1", techCtx, {
        getAuditEntry: (id) => catalog.get(id) ?? null,
        ...createCrmRestoreDeps(store),
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
