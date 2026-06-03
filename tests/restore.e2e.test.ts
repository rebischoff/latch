import { afterEach, describe, expect, it } from "vitest";

import { setAuditWriter, type StoredAuditEntry } from "@latch/audit";
import { NotFoundError } from "@latch/contracts";
import {
  SEED_JOB_OTHER,
  SEED_JOB_OWNED,
  SEED_TECH_ID,
  createJobPolicyService,
  createSeededJobsDalWithAudit,
  resolveFieldTechJobDetailCtx,
  resolveOfficeAdminJobDetailCtx,
  resolveOfficeAdminJobListCtx,
  restoreJobFromDeleteAuditRow,
} from "@latch/crm/test-utils";

const policy = createJobPolicyService();

afterEach(() => {
  setAuditWriter(null);
});

describe("restore — delete → audit → replay (e2e)", () => {
  it("hard-delete job with assignments, restore from audit, field_tech row-scope intact", async () => {
    const { store, dal, audit } = createSeededJobsDalWithAudit();
    const catalog = new Map<string, StoredAuditEntry>();

    const adminCtx = await resolveOfficeAdminJobDetailCtx(
      store,
      SEED_JOB_OWNED,
      policy,
    );
    expect(adminCtx.manifest.actions).toEqual(
      expect.arrayContaining(["delete", "restore"]),
    );

    const beforeDelete = dal.get(adminCtx, SEED_JOB_OWNED);
    expect(beforeDelete.summary?.title).toBe("Panel upgrade — 123 Main St");
    expect(beforeDelete.financial_terms?.contract_amount).toBe("12500.00");

    await dal.delete(adminCtx, SEED_JOB_OWNED);

    expect(store.getJob(SEED_JOB_OWNED)).toBeUndefined();
    expect(store.getAssignmentsForJob(SEED_JOB_OWNED)).toEqual([]);

    expect(() => dal.get(adminCtx, SEED_JOB_OWNED)).toThrow(NotFoundError);

    const listCtx = await resolveOfficeAdminJobListCtx(store, policy);
    const { rows, total } = dal.list(listCtx);
    expect(total).toBe(1);
    expect(rows.map((r) => r.id)).toEqual([SEED_JOB_OTHER]);

    expect(audit.entries).toHaveLength(1);
    const deleteAudit = audit.entries[0];
    expect(deleteAudit).toMatchObject({
      actorId: adminCtx.principal.id,
      action: "delete",
      tableName: "jobs",
      recordId: SEED_JOB_OWNED,
      moduleId: "job_detail",
      after: null,
    });
    expect(
      (deleteAudit?.before as { assignments?: unknown[] })?.assignments,
    ).toEqual([{ job_id: SEED_JOB_OWNED, user_id: SEED_TECH_ID }]);

    catalog.set("audit-delete-1", { id: "audit-delete-1", ...deleteAudit! });

    const restoreCtx = await resolveOfficeAdminJobDetailCtx(
      store,
      SEED_JOB_OWNED,
      policy,
    );
    await restoreJobFromDeleteAuditRow(
      store,
      "audit-delete-1",
      restoreCtx,
      catalog,
    );

    expect(audit.entries.some((e) => e.action === "restore")).toBe(true);
    expect(audit.entries.filter((e) => e.action === "restore")).toHaveLength(1);

    const restored = dal.get(adminCtx, SEED_JOB_OWNED);
    expect(restored.summary?.title).toBe(beforeDelete.summary?.title);
    expect(restored.financial_terms?.contract_amount).toBe(
      beforeDelete.financial_terms?.contract_amount,
    );
    expect(store.getAssignmentsForJob(SEED_JOB_OWNED)).toEqual([
      { jobId: SEED_JOB_OWNED, userId: SEED_TECH_ID },
    ]);

    const techCtx = await resolveFieldTechJobDetailCtx(
      store,
      SEED_JOB_OWNED,
      policy,
    );
    expect(techCtx.manifest.rowScope).toBe("own");
    const techDto = dal.get(techCtx, SEED_JOB_OWNED);
    expect(techDto.id).toBe(SEED_JOB_OWNED);
    expect(techDto).not.toHaveProperty("financial_terms");

    expect(() => dal.get(techCtx, SEED_JOB_OTHER)).toThrow(NotFoundError);

    const listAfter = dal.list(listCtx);
    expect(listAfter.total).toBe(2);
    expect(listAfter.rows.map((r) => r.id).sort()).toEqual(
      [SEED_JOB_OTHER, SEED_JOB_OWNED].sort(),
    );
  });
});
