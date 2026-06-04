import { afterEach, describe, expect, it } from "vitest";

import { setAuditWriter } from "@latch/audit";
import {
  SEED_ADMIN_ID,
  SEED_JOB_OTHER,
  SEED_JOB_OWNED,
  SEED_TECH_ID,
  createJobPolicyService,
  createSeededJobsDalWithAudit,
  resolveFieldTechJobDetailCtx,
  resolveFieldTechJobListCtx,
  resolveOfficeAdminJobDetailCtx,
  seedBulkJobs,
} from "@latch/crm/test-utils";

const policy = createJobPolicyService();

afterEach(() => {
  setAuditWriter(null);
});

describe("verification — accept / reject / bulk pending (e2e)", () => {
  it("field_tech submit → live unchanged → office_admin accept → DTO + approve audit", async () => {
    const { store, dal, audit, pendingStore } = createSeededJobsDalWithAudit();

    const techCtx = await resolveFieldTechJobDetailCtx(
      store,
      SEED_JOB_OWNED,
      policy,
    );
    const proposedAmount = "18750.00";

    const patchDto = await dal.patch(techCtx, SEED_JOB_OWNED, {
      financial_terms: { contract_amount: proposedAmount },
    });

    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("12500.00");
    expect(patchDto).not.toHaveProperty("financial_terms");

    const pending = await pendingStore.getPendingForEntity(SEED_JOB_OWNED, {
      surfaceId: "job_detail",
      status: "submitted",
    });
    expect(pending).toHaveLength(1);
    expect(pending[0]?.submittedBy).toBe(SEED_TECH_ID);

    const adminCtx = await resolveOfficeAdminJobDetailCtx(
      store,
      SEED_JOB_OWNED,
      policy,
    );
    const accepted = await dal.acceptPending(adminCtx, pending[0]!.id);

    expect(accepted.financial_terms?.contract_amount).toBe(proposedAmount);
    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe(proposedAmount);
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
      contract_amount: proposedAmount,
    });
  });

  it("field_tech submit on second job → reject leaves live data + reject audit", async () => {
    const { store, dal, audit, pendingStore } = createSeededJobsDalWithAudit();

    store.addAssignment({ jobId: SEED_JOB_OTHER, userId: SEED_TECH_ID });

    const techCtx = await resolveFieldTechJobDetailCtx(
      store,
      SEED_JOB_OTHER,
      policy,
    );
    const rejectedAmount = "99999.00";

    await dal.patch(techCtx, SEED_JOB_OTHER, {
      financial_terms: { contract_amount: rejectedAmount },
    });

    expect(store.getJob(SEED_JOB_OTHER)?.contractAmount).toBe("8900.00");

    const pending = await pendingStore.getPendingForEntity(SEED_JOB_OTHER, {
      surfaceId: "job_detail",
      status: "submitted",
    });
    expect(pending).toHaveLength(1);

    const adminCtx = await resolveOfficeAdminJobDetailCtx(
      store,
      SEED_JOB_OTHER,
      policy,
    );
    await dal.rejectPending(adminCtx, pending[0]!.id, {
      comment: "Amount not approved",
    });

    expect(store.getJob(SEED_JOB_OTHER)?.contractAmount).toBe("8900.00");
    expect((await pendingStore.getById(pending[0]!.id))?.status).toBe("rejected");

    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      actorId: SEED_ADMIN_ID,
      action: "reject",
      tableName: "jobs",
      recordId: SEED_JOB_OTHER,
      moduleId: "job_detail",
      fieldIds: ["financial_terms"],
      approvalId: pending[0]!.id,
      patch: { financial_terms: { contract_amount: rejectedAmount } },
    });
  });

  it("bulk: two jobs → shared batch_id, two submitted pendings, live unchanged", async () => {
    const { store, dal, audit, pendingStore } = createSeededJobsDalWithAudit();

    const jobIds = seedBulkJobs(store, 2, {
      prefix: "seed-verification-bulk",
      assigneeId: SEED_TECH_ID,
    });

    const listCtx = await resolveFieldTechJobListCtx(store, policy);
    const bulkAmount = "22000.00";

    const result = await dal.bulkUpdate(listCtx, jobIds, {
      financial_terms: { contract_amount: bulkAmount },
    });

    expect(result.succeeded).toEqual(jobIds);
    expect(result.skipped).toHaveLength(0);

    for (const id of jobIds) {
      expect(store.getJob(id)?.contractAmount).toBe("1000.00");
    }

    const pendings = (
      await Promise.all(
        jobIds.map((id) =>
          pendingStore.getPendingForEntity(id, {
            surfaceId: "job_list",
            status: "submitted",
          }),
        ),
      )
    ).flat();

    expect(pendings).toHaveLength(2);
    expect(new Set(pendings.map((p) => p.batchId)).size).toBe(1);
    for (const p of pendings) {
      expect(p.patch).toEqual({
        financial_terms: { contract_amount: bulkAmount },
      });
      expect(p.submittedBy).toBe(SEED_TECH_ID);
    }

    expect(audit.entries).toHaveLength(0);
  });
});
