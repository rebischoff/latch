import { afterEach, describe, expect, it } from "vitest";

import * as auditModule from "@latch/audit";
import { createMemoryPendingStore } from "@latch/approval";
import { runCodegen } from "@latch/codegen";
import { createMemoryAuditWriter, setAuditWriter } from "@latch/audit";
import {
  ForbiddenError,
  ValidationError,
  type Manifest,
  type PermissionContext,
} from "@latch/contracts";
import {
  createJobsDal,
  MemoryJobStore,
  SEED_ADMIN_ID,
  SEED_JOB_OWNED,
  SEED_TECH_ID,
  seedPilotJobs,
} from "@latch/dal";
import { PolicyService } from "@latch/policy";

const policy = new PolicyService();

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

const stripApproveOnFinancial = (manifest: Manifest): Manifest => ({
  ...manifest,
  fields: {
    ...manifest.fields,
    financial_terms: (manifest.fields.financial_terms ?? []).filter(
      (a) => a !== "approve",
    ),
  },
});

describe("threat model — T1 mass assignment", () => {
  const audit = createMemoryAuditWriter();

  afterEach(() => {
    audit.reset();
    setAuditWriter(null);
  });

  it("rejects unknown / non-writable keys; no audit row written", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());
    const ctx = buildCtx(SEED_TECH_ID, ["field_tech"], SEED_JOB_OWNED);

    await expect(
      dal.patch(ctx, SEED_JOB_OWNED, {
        summary: { title: "Ok" },
        hourly_rate: 0.01,
      }),
    ).rejects.toThrow(ValidationError);

    expect(audit.entries).toHaveLength(0);
    expect(store.getJob(SEED_JOB_OWNED)?.title).toContain("Panel upgrade");
  });
});

describe("threat model — T2 forbidden field read", () => {
  it("DTO omits unread Fields per manifest (no null placeholders)", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());

    const techDto = dal.get(
      buildCtx(SEED_TECH_ID, ["field_tech"]),
      SEED_JOB_OWNED,
    );
    const adminDto = dal.get(
      buildCtx(SEED_ADMIN_ID, ["office_admin"]),
      SEED_JOB_OWNED,
    );

    expect(techDto).not.toHaveProperty("financial_terms");
    expect(adminDto.financial_terms?.contract_amount).toBe("12500.00");
    expect(Object.keys(techDto).sort()).not.toEqual(Object.keys(adminDto).sort());
  });
});

describe("threat model — T3 stale manifest exploit", () => {
  const audit = createMemoryAuditWriter();

  afterEach(() => {
    audit.reset();
    setAuditWriter(null);
  });

  it("re-resolved manifest without approve → acceptPending returns 403", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const pendingStore = createMemoryPendingStore();
    const dal = createJobsDal(store, pendingStore);

    await dal.patch(buildCtx(SEED_TECH_ID, ["field_tech"]), SEED_JOB_OWNED, {
      financial_terms: { contract_amount: "15000.00" },
    });

    const pending = pendingStore.getPendingForEntity(SEED_JOB_OWNED, {
      status: "submitted",
    });
    expect(pending).toHaveLength(1);

    const staleCtx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);
    expect(staleCtx.manifest.fields.financial_terms).toContain("approve");

    const freshCtx: PermissionContext = {
      ...staleCtx,
      manifest: stripApproveOnFinancial(staleCtx.manifest),
    };

    await expect(dal.acceptPending(freshCtx, pending[0]!.id)).rejects.toThrow(
      ForbiddenError,
    );

    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("12500.00");
    expect(audit.entries).toHaveLength(0);
  });
});

describe("threat model — T6 audit tampering", () => {
  it("audit package exposes append-only write API (no update/delete helpers)", () => {
    const exportNames = Object.keys(auditModule).sort();
    expect(exportNames).not.toContain("updateAudit");
    expect(exportNames).not.toContain("deleteAudit");
    expect(exportNames).toContain("writeAudit");
  });

  it.runIf(Boolean(process.env.DATABASE_URL))(
    "UPDATE latch_audit from app role is rejected by DB trigger",
    async () => {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      try {
        await pool.query(
          `INSERT INTO latch_audit (actor_id, action, entity_type, entity_id)
           VALUES ('threat-test', 'update', 'jobs', 'job-1')
           RETURNING id`,
        );

        const row = await pool.query<{ id: string }>(
          "SELECT id::text FROM latch_audit ORDER BY id DESC LIMIT 1",
        );
        const auditId = row.rows[0]?.id;
        expect(auditId).toBeTruthy();

        await expect(
          pool.query("UPDATE latch_audit SET action = 'tamper' WHERE id = $1", [
            auditId,
          ]),
        ).rejects.toMatchObject({
          message: expect.stringMatching(/immutable/i),
        });
      } finally {
        await pool.end();
      }
    },
  );
});

describe("threat model — T11 codegen drift", () => {
  it("generated TS matches Surface YAML (check mode)", async () => {
    const result = await runCodegen(true);
    expect(result.ok).toBe(true);
    expect(result.drift ?? []).toHaveLength(0);
  });
});

describe("threat model — T13 field reference forgery", () => {
  it("unknown field_id in PATCH body → ValidationError (400)", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());
    const ctx = buildCtx(SEED_ADMIN_ID, ["office_admin"], SEED_JOB_OWNED);

    const err = await dal
      .patch(ctx, SEED_JOB_OWNED, {
        salary_band: { min: 0 },
      })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).statusCode).toBe(400);
  });
});
