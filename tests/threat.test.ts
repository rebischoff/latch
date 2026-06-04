import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as auditModule from "@latch/audit";
import { createMemoryPendingStore } from "@latch/approval";
import { runCodegen } from "@latch/codegen";
import { createMemoryAuditWriter, setAuditWriter } from "@latch/audit";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  type Manifest,
  type PermissionContext,
} from "@latch/contracts";
import {
  createCustomersDal,
  createJobsDal,
  createJobPolicyService,
  MemoryJobStore,
  principalFromStore,
  revokeRoleForUser,
  SEED_ADMIN_ID,
  SEED_CUSTOMER_ACME,
  SEED_IAM_ID,
  SEED_JOB_OTHER,
  SEED_JOB_OWNED,
  SEED_TECH_ID,
  seedPilotJobs,
} from "@latch/crm/test-utils";
import {
  createCachingPolicyService,
  createMapManifestCacheStore,
} from "@latch/policy";
import { createSurfaceDal } from "@latch/dal";
import { createJobStoreAdapter } from "../apps/crm/db/store.js";
import { createJobDetailDescriptor } from "../apps/crm/src/lib/jobs/descriptors.js";

import { resolveNavItems } from "../apps/crm/src/lib/nav.js";
import * as providerSession from "@/lib/auth/provider-session.js";
import { getPilotStore } from "@/lib/pilot-store";
import {
  GET as iamUsersGet,
  PATCH as iamUsersPatch,
} from "@/app/api/iam/users/[id]/route";

vi.mock("@/lib/auth/provider-session.js", () => ({
  readProviderSession: vi.fn(),
}));

const readProviderSession = vi.mocked(providerSession.readProviderSession);

const policy = createJobPolicyService();

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

const principal = (userId: string, ...roles: string[]) => ({ id: userId, roles });

const stripApproveOnFinancial = (manifest: Manifest): Manifest => ({
  ...manifest,
  fields: {
    ...manifest.fields,
    financial_terms: (manifest.fields.financial_terms ?? []).filter(
      (a) => a !== "approve",
    ),
  },
});

const stripSubmitOnFinancial = (manifest: Manifest): Manifest => ({
  ...manifest,
  fields: {
    ...manifest.fields,
    financial_terms: (manifest.fields.financial_terms ?? []).filter(
      (a) => a !== "submit",
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

describe("threat model — T2 forbidden field read (customer_detail)", () => {
  it("admin DTO keys match grants; partial manifest omits denied Fields", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createCustomersDal(store);

    const adminDto = dal.get(
      buildCustomerCtx(SEED_ADMIN_ID, ["office_admin"]),
      SEED_CUSTOMER_ACME,
    );
    expect(adminDto.profile).toBeDefined();
    expect(adminDto.billing).toBeDefined();
    expect(adminDto.sites).toBeDefined();
    expect(adminDto.job_history).toBeDefined();

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
    const partialDto = dal.get(billingDeniedCtx, SEED_CUSTOMER_ACME);
    expect(partialDto.profile).toBeDefined();
    expect(partialDto).not.toHaveProperty("billing");
    expect(Object.keys(partialDto)).not.toContain("billing");
  });

  it("tech with no Surface grant → NotFoundError (404 hide); admin get succeeds", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createCustomersDal(store);

    const techCtx = buildCustomerCtx(SEED_TECH_ID, ["field_tech"]);
    expect(techCtx.manifest.actions).toEqual([]);

    expect(() => dal.get(techCtx, SEED_CUSTOMER_ACME)).toThrow(NotFoundError);

    const adminDto = dal.get(
      buildCustomerCtx(SEED_ADMIN_ID, ["office_admin"]),
      SEED_CUSTOMER_ACME,
    );
    expect(adminDto.id).toBe(SEED_CUSTOMER_ACME);
  });
});

describe("threat model — T2 forbidden field read (list)", () => {
  it("tech list DTO omits financial_terms (key absent, not null)", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());

    const techRows = dal.list(buildListCtx(SEED_TECH_ID, ["field_tech"])).rows;
    const adminRows = dal.list(buildListCtx(SEED_ADMIN_ID, ["office_admin"])).rows;

    expect(techRows.length).toBeGreaterThan(0);
    for (const row of techRows) {
      // Property absence, not a `null` placeholder (T2 control).
      expect(row).not.toHaveProperty("financial_terms");
      expect(Object.keys(row)).not.toContain("financial_terms");
    }

    const adminOwned = adminRows.find((r) => r.id === SEED_JOB_OWNED);
    expect(adminOwned?.financial_terms?.contract_amount).toBe("12500.00");
  });
});

describe("threat model — T3 stale manifest exploit", () => {
  const audit = createMemoryAuditWriter();
  const jobDetailScope = (entityId: string) =>
    ({
      surface: "job_detail" as const,
      mode: "detail" as const,
      entityId,
    }) as const;

  afterEach(() => {
    audit.reset();
    setAuditWriter(null);
    vi.restoreAllMocks();
  });

  const submitFinancialPending = async (
    dal: ReturnType<typeof createJobsDal>,
    pendingStore: ReturnType<typeof createMemoryPendingStore>,
  ) => {
    await dal.patch(buildCtx(SEED_TECH_ID, ["field_tech"]), SEED_JOB_OWNED, {
      financial_terms: { contract_amount: "15000.00" },
    });

    const pending = await pendingStore.getPendingForEntity(SEED_JOB_OWNED, {
      status: "submitted",
    });
    expect(pending).toHaveLength(1);
    return pending[0]!;
  };

  it("re-resolved manifest without approve → acceptPending returns 403", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const pendingStore = createMemoryPendingStore();
    const dal = createJobsDal(store, pendingStore);

    const pending = await submitFinancialPending(dal, pendingStore);

    const staleCtx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);
    expect(staleCtx.manifest.fields.financial_terms).toContain("approve");

    const freshCtx: PermissionContext = {
      ...staleCtx,
      manifest: stripApproveOnFinancial(staleCtx.manifest),
    };

    await expect(dal.acceptPending!(freshCtx, pending.id)).rejects.toThrow(
      ForbiddenError,
    );

    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("12500.00");
    expect(audit.entries).toHaveLength(0);
  });

  it("re-resolved manifest without approve → rejectPending returns 403", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const pendingStore = createMemoryPendingStore();
    const dal = createJobsDal(store, pendingStore);

    const pending = await submitFinancialPending(dal, pendingStore);

    const staleCtx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);
    const freshCtx: PermissionContext = {
      ...staleCtx,
      manifest: stripApproveOnFinancial(staleCtx.manifest),
    };

    await expect(dal.rejectPending!(freshCtx, pending.id)).rejects.toThrow(
      ForbiddenError,
    );

    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("12500.00");
    expect(audit.entries).toHaveLength(0);
  });

  it("re-resolved manifest without submit → withdrawPending returns 403", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const pendingStore = createMemoryPendingStore();
    const dal = createJobsDal(store, pendingStore);

    const pending = await submitFinancialPending(dal, pendingStore);

    const staleCtx = buildCtx(SEED_ADMIN_ID, ["office_admin"]);
    const staleWithSubmit: PermissionContext = {
      ...staleCtx,
      manifest: {
        ...staleCtx.manifest,
        fields: {
          ...staleCtx.manifest.fields,
          financial_terms: [
            ...(staleCtx.manifest.fields.financial_terms ?? []),
            "submit",
          ],
        },
      },
    };
    const freshCtx: PermissionContext = {
      ...staleWithSubmit,
      manifest: stripSubmitOnFinancial(staleWithSubmit.manifest),
    };

    await expect(
      dal.withdrawPending!(freshCtx, pending.id),
    ).rejects.toThrow(ForbiddenError);

    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("12500.00");
  });

  it("read cache: duplicate resolve hits cache before IAM revoke", () => {
    const inner = createJobPolicyService();
    const map = new Map<string, Manifest>();
    const caching = createCachingPolicyService(
      inner,
      { mode: "request" },
      createMapManifestCacheStore(map),
    );
    const scope = jobDetailScope(SEED_JOB_OWNED);
    const principal = {
      id: SEED_ADMIN_ID,
      roles: ["office_admin"],
      policyVersion: 1,
    };

    const spy = vi.spyOn(inner, "resolve");
    caching.resolve(principal, scope);
    caching.resolve(principal, scope);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("read cache + revoked role: fresh resolve on mutation → 403 (stale cache entry not used)", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());
    const inner = createJobPolicyService();
    const map = new Map<string, Manifest>();
    const caching = createCachingPolicyService(
      inner,
      { mode: "request" },
      createMapManifestCacheStore(map),
    );
    const scope = jobDetailScope(SEED_JOB_OWNED);

    const beforeRevoke = await principalFromStore(store, SEED_ADMIN_ID, {
      policyVersion: 1,
    });
    const staleManifest = caching.resolve(beforeRevoke, scope);
    expect(staleManifest.actions).toContain("delete");

    revokeRoleForUser(store, SEED_ADMIN_ID, "office_admin");

    const afterRevoke = await principalFromStore(store, SEED_ADMIN_ID, {
      policyVersion: 2,
    });
    const freshManifest = caching.resolve(afterRevoke, scope, {
      bypassCache: true,
    });
    expect(freshManifest.actions).not.toContain("delete");

    const freshCtx: PermissionContext = {
      principal: afterRevoke,
      manifest: freshManifest,
      surface: "job_detail",
    };
    await expect(dal.delete(freshCtx, SEED_JOB_OWNED)).rejects.toThrow(
      ForbiddenError,
    );
    expect(store.getJob(SEED_JOB_OWNED)).toBeDefined();
    expect(audit.entries.filter((e) => e.action === "delete")).toHaveLength(0);
  });

  it("read cache + policyVersion bump: stale generation not returned after principal version changes", () => {
    const inner = createJobPolicyService();
    const map = new Map<string, Manifest>();
    const cacheStore = createMapManifestCacheStore(map);
    const caching = createCachingPolicyService(
      inner,
      { mode: "request" },
      cacheStore,
    );
    const scope = jobDetailScope(SEED_JOB_OWNED);
    const v1 = { id: SEED_ADMIN_ID, roles: ["office_admin"], policyVersion: 1 };

    const spy = vi.spyOn(inner, "resolve");
    const first = caching.resolve(v1, scope);
    expect(first.actions).toContain("delete");

    cacheStore.deleteByVersion(1);

    const v2 = { id: SEED_ADMIN_ID, roles: ["office_admin"], policyVersion: 2 };
    const second = caching.resolve(v2, scope);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(second.policyVersion).toBe(2);
    expect(second.actions).toContain("delete");
  });
});

describe("threat model — T7 pending tampering", () => {
  const audit = createMemoryAuditWriter();

  afterEach(() => {
    audit.reset();
    setAuditWriter(null);
  });

  it("after accept, second accept/reject/withdraw → NotFound (terminal immutability)", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const pendingStore = createMemoryPendingStore();
    const dal = createJobsDal(store, pendingStore);

    await dal.patch(buildCtx(SEED_TECH_ID, ["field_tech"]), SEED_JOB_OWNED, {
      financial_terms: { contract_amount: "15000.00" },
    });

    const pending = await pendingStore.getPendingForEntity(SEED_JOB_OWNED, {
      status: "submitted",
    });
    expect(pending).toHaveLength(1);
    const pendingId = pending[0]!.id;

    const adminCtx = buildCtx(SEED_ADMIN_ID, ["office_admin"], SEED_JOB_OWNED);
    await dal.acceptPending!(adminCtx, pendingId);

    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("15000.00");

    await expect(dal.acceptPending!(adminCtx, pendingId)).rejects.toThrow(
      NotFoundError,
    );
    await expect(dal.rejectPending!(adminCtx, pendingId)).rejects.toThrow(
      NotFoundError,
    );
    await expect(
      dal.withdrawPending!(
        buildCtx(SEED_TECH_ID, ["field_tech"], SEED_JOB_OWNED),
        pendingId,
      ),
    ).rejects.toThrow(NotFoundError);

    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("15000.00");
    expect(audit.entries.filter((e) => e.action === "approve")).toHaveLength(1);
  });
});

describe("threat model — T10 approval bypass", () => {
  const audit = createMemoryAuditWriter();

  afterEach(() => {
    audit.reset();
    setAuditWriter(null);
  });

  it("submit-only PATCH to verification Field routes pending; live contract_amount unchanged", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const pendingStore = createMemoryPendingStore();
    const dal = createJobsDal(store, pendingStore);
    const techCtx = buildCtx(SEED_TECH_ID, ["field_tech"], SEED_JOB_OWNED);

    await dal.patch(techCtx, SEED_JOB_OWNED, {
      financial_terms: { contract_amount: "99999.00" },
    });

    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("12500.00");
    expect(audit.entries).toHaveLength(0);

    const open = await pendingStore.getPendingForEntity(SEED_JOB_OWNED, {
      status: "submitted",
    });
    expect(open).toHaveLength(1);
    expect(open[0]?.patch).toEqual({
      financial_terms: { contract_amount: "99999.00" },
    });
  });

  it("verification Field without pending store or accept path → ForbiddenError", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const adapter = createJobStoreAdapter(store);
    const dal = createSurfaceDal(createJobDetailDescriptor(store), adapter);
    const techCtx = buildCtx(SEED_TECH_ID, ["field_tech"], SEED_JOB_OWNED);

    await expect(
      dal.patch(techCtx, SEED_JOB_OWNED, {
        financial_terms: { contract_amount: "99999.00" },
      }),
    ).rejects.toThrow(ForbiddenError);

    expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("12500.00");
  });
});

const latchAppDatabaseUrl = (): string | undefined => {
  const appUrl = process.env.LATCH_APP_DATABASE_URL?.trim();
  if (appUrl) {
    return appUrl;
  }
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl?.includes("latch_app")) {
    return databaseUrl;
  }
  return undefined;
};

describe("threat model — T5 privileged DB role bypass", () => {
  it.runIf(Boolean(latchAppDatabaseUrl()))(
    "app connection is latch_app and not superuser",
    async () => {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: latchAppDatabaseUrl() });

      try {
        const user = await pool.query<{ current_user: string }>(
          "SELECT current_user",
        );
        expect(user.rows[0]?.current_user).toBe("latch_app");

        const role = await pool.query<{ rolsuper: boolean }>(
          `SELECT rolsuper FROM pg_roles WHERE rolname = current_user`,
        );
        expect(role.rows[0]?.rolsuper).toBe(false);
      } finally {
        await pool.end();
      }
    },
  );
});

describe("threat model — T12 session var leak across requests", () => {
  it.runIf(Boolean(latchAppDatabaseUrl()))(
    "alternating principals bind session vars and attribute audit/pending rows correctly on a reused pool connection",
    async () => {
      const { Pool } = await import("pg");
      const { withPermissionDb } = await import("@latch/audit");
      const { createPostgresPendingStore } = await import("@latch/approval");
      const { createPostgresAuditWriter } = await import(
        "../apps/crm/src/lib/audit-db-writer.js"
      );

      const url = latchAppDatabaseUrl()!;
      const pool = new Pool({ connectionString: url, max: 1 });
      const audit = createPostgresAuditWriter(url);
      const pending = createPostgresPendingStore(url);

      const actorA = `t12-actor-a-${crypto.randomUUID()}`;
      const actorB = `t12-actor-b-${crypto.randomUUID()}`;
      const entityId = `t12-entity-${crypto.randomUUID()}`;

      try {
        for (let i = 0; i < 8; i++) {
          const actor = i % 2 === 0 ? actorA : actorB;

          await withPermissionDb(pool, actor, async (client) => {
            const bound = await client.query<{ pid: string; cid: string }>(
              `SELECT
                 current_setting('app.principal_id', true) AS pid,
                 current_setting('app.company_id', true) AS cid`,
            );
            expect(bound.rows[0]?.pid).toBe(actor);
            expect(bound.rows[0]?.cid).toBe("default");
          });

          await audit.writer({
            actorId: actor,
            action: "update",
            tableName: "jobs",
            recordId: entityId,
          });

          await pending.store.submit({
            surfaceId: "job_detail",
            entityId: `${entityId}-${i}`,
            fieldIds: ["financial_terms"],
            patch: { financial_terms: { contract_amount: `${i}.00` } },
            submittedBy: actor,
          });
        }

        const auditRows = await pool.query<{ actor_id: string }>(
          `SELECT actor_id FROM latch_audit
           WHERE entity_id = $1
           ORDER BY id ASC`,
          [entityId],
        );
        expect(auditRows.rows).toHaveLength(8);
        for (let i = 0; i < auditRows.rows.length; i++) {
          expect(auditRows.rows[i]?.actor_id).toBe(
            i % 2 === 0 ? actorA : actorB,
          );
        }

        const pendingRows = await pool.query<{ submitted_by: string }>(
          `SELECT submitted_by FROM latch_pending_changes
           WHERE entity_id LIKE $1
           ORDER BY submitted_at ASC`,
          [`${entityId}-%`],
        );
        expect(pendingRows.rows).toHaveLength(8);
        for (let i = 0; i < pendingRows.rows.length; i++) {
          expect(pendingRows.rows[i]?.submitted_by).toBe(
            i % 2 === 0 ? actorA : actorB,
          );
        }
      } finally {
        await pool.query(
          "DELETE FROM latch_pending_changes WHERE entity_id LIKE $1",
          [`${entityId}-%`],
        );
        await pool.query("DELETE FROM latch_audit WHERE entity_id = $1", [
          entityId,
        ]);
        await audit.close();
        await pending.close();
        await pool.end();
      }
    },
  );
});

describe("threat model — T6 audit tampering", () => {
  it("audit package exposes append-only write API (no update/delete helpers)", () => {
    const exportNames = Object.keys(auditModule).sort();
    expect(exportNames).not.toContain("updateAudit");
    expect(exportNames).not.toContain("deleteAudit");
    expect(exportNames).toContain("writeAudit");
  });

  it.runIf(Boolean(latchAppDatabaseUrl()))(
    "UPDATE latch_audit from app role is rejected (grants and/or immutability trigger)",
    async () => {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: latchAppDatabaseUrl() });

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
          message: expect.stringMatching(/immutable|permission denied/i),
        });
      } finally {
        await pool.end();
      }
    },
  );
});

describe("threat model — T4 forbidden response semantics", () => {
  it("customer_detail no-grant → NotFoundError; job delete without grant → ForbiddenError", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const customersDal = createCustomersDal(store);
    const jobsDal = createJobsDal(store, createMemoryPendingStore());

    expect(() =>
      customersDal.get(
        buildCustomerCtx(SEED_TECH_ID, ["field_tech"]),
        SEED_CUSTOMER_ACME,
      ),
    ).toThrow(NotFoundError);

    const techJobCtx = buildCtx(SEED_TECH_ID, ["field_tech"], SEED_JOB_OWNED);
    await expect(jobsDal.delete(techJobCtx, SEED_JOB_OWNED)).rejects.toThrow(
      ForbiddenError,
    );
  });
});

describe("threat model — T8 privilege escalation via role assignment", () => {
  const patchUser = (id: string, body: unknown): Promise<Response> =>
    iamUsersPatch(
      new Request(`http://localhost/api/iam/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );

  const getUser = (id: string): Promise<Response> =>
    iamUsersGet(new Request(`http://localhost/api/iam/users/${id}`), {
      params: Promise.resolve({ id }),
    });

  beforeEach(() => {
    // The IAM route reads the shared pilot store; re-seed for a deterministic baseline.
    seedPilotJobs(getPilotStore());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("field_tech PATCH /api/iam/users to self-assign iam_master → 404 hide; latch_user_roles unchanged", async () => {
    readProviderSession.mockResolvedValue({
      userId: SEED_TECH_ID,
      label: "tech@demo.local",
    });
    const store = getPilotStore();
    const before = store.listRolesForUser(SEED_TECH_ID);

    const res = await patchUser(SEED_TECH_ID, {
      role_assignments: ["field_tech", "iam_master"],
    });

    // `user_roles_detail` is `forbiddenFieldResponse: 404` → default-deny hides existence.
    expect(res.status).toBe(404);
    expect(store.listRolesForUser(SEED_TECH_ID)).toEqual(before);
    expect(store.listRolesForUser(SEED_TECH_ID)).not.toContain("iam_master");
  });

  it("iam_master PATCH assigns a role and GET reflects the change (T8 positive)", async () => {
    readProviderSession.mockResolvedValue({
      userId: SEED_IAM_ID,
      label: "iam@demo.local",
    });
    const store = getPilotStore();

    const patchRes = await patchUser(SEED_TECH_ID, {
      role_assignments: ["field_tech", "office_admin"],
    });
    expect(patchRes.status).toBe(200);
    expect(store.listRolesForUser(SEED_TECH_ID)).toEqual([
      "field_tech",
      "office_admin",
    ]);

    const getRes = await getUser(SEED_TECH_ID);
    expect(getRes.status).toBe(200);
    const body = (await getRes.json()) as {
      data: { role_assignments: string[] };
    };
    expect(body.data.role_assignments).toEqual(["field_tech", "office_admin"]);
  });
});

describe("threat model — T14 nav manifest leakage", () => {
  it("field_tech nav omits Customers route; no Surface ids in nav DTO", () => {
    const techNav = resolveNavItems(principal(SEED_TECH_ID, "field_tech"));
    expect(techNav.map((item) => item.href)).toEqual(["/jobs"]);
    expect(JSON.stringify(techNav)).not.toMatch(/customer_detail|\/customers/);

    for (const item of techNav) {
      expect(Object.keys(item).sort()).toEqual(["href", "key", "label"]);
    }
  });

  it("office_admin nav includes Customers; still no Surface ids leaked", () => {
    const adminNav = resolveNavItems(principal(SEED_ADMIN_ID, "office_admin"));
    expect(adminNav.map((item) => item.href)).toEqual(["/jobs", "/customers"]);
    expect(JSON.stringify(adminNav)).not.toMatch(/customer_detail|job_detail/);
  });

  it("field_tech customer_detail manifest has no read grant", () => {
    const techManifest = policy.resolve(
      principal(SEED_TECH_ID, "field_tech"),
      { surface: "customer_detail", mode: "detail" },
    );
    expect(techManifest.actions).toEqual([]);
    expect(techManifest.fields.profile).toEqual([]);
    expect(techManifest.fields.billing).toEqual([]);
  });
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

describe("threat model — T15 bulk operation partial-corruption", () => {
  const audit = createMemoryAuditWriter();

  afterEach(() => {
    audit.reset();
    setAuditWriter(null);
  });

  // A row-scoped writer: granted `write` on `assignments` but limited to its
  // own rows (`rowScope: "own"`). Out-of-scope rows are "forbidden" and surface
  // as `not_found` (no existence side-channel). No real role grants this combo,
  // so we craft it from the admin manifest to isolate the bulk control.
  const rowScopedWriterCtx = (): PermissionContext => {
    const admin = buildListCtx(SEED_ADMIN_ID, ["office_admin"]);
    return {
      principal: { id: SEED_TECH_ID, roles: ["field_tech"] },
      manifest: { ...admin.manifest, rowScope: "own" },
      surface: "job_list",
    };
  };

  const REASSIGN_PATCH = { assignments: [{ user_id: SEED_ADMIN_ID }] };

  it("all_or_nothing with a forbidden (out-of-scope) row → zero DB mutation", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());
    const ctx = rowScopedWriterCtx();

    const ownedBefore = store
      .getAssignmentsForJob(SEED_JOB_OWNED)
      .map((a) => a.userId);
    const otherBefore = store
      .getAssignmentsForJob(SEED_JOB_OTHER)
      .map((a) => a.userId);

    const result = await dal.bulkUpdate(
      ctx,
      [SEED_JOB_OWNED, SEED_JOB_OTHER],
      REASSIGN_PATCH,
      { mode: "all_or_nothing", requestId: "threat-t15-aon" },
    );

    expect(result.succeeded).toHaveLength(0);
    expect(result.skipped).toEqual([{ id: SEED_JOB_OTHER, reason: "not_found" }]);
    expect(result.failed).toHaveLength(0);

    // Permitted row stays untouched because the batch was rejected wholesale.
    expect(store.getAssignmentsForJob(SEED_JOB_OWNED).map((a) => a.userId)).toEqual(
      ownedBefore,
    );
    expect(store.getAssignmentsForJob(SEED_JOB_OTHER).map((a) => a.userId)).toEqual(
      otherBefore,
    );
    // No row mutated ⇒ no audit rows (not even a bulk_summary).
    expect(audit.entries).toHaveLength(0);
  });

  it("partial with mixed rows → permitted applied, forbidden skipped, DB consistent", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());
    const ctx = rowScopedWriterCtx();

    const otherBefore = store
      .getAssignmentsForJob(SEED_JOB_OTHER)
      .map((a) => a.userId);

    const result = await dal.bulkUpdate(
      ctx,
      [SEED_JOB_OWNED, SEED_JOB_OTHER],
      REASSIGN_PATCH,
      { mode: "partial", requestId: "threat-t15-partial" },
    );

    expect(result.succeeded).toEqual([SEED_JOB_OWNED]);
    expect(result.skipped).toEqual([{ id: SEED_JOB_OTHER, reason: "not_found" }]);
    expect(result.failed).toHaveLength(0);

    // Permitted row reflects the write...
    expect(store.getAssignmentsForJob(SEED_JOB_OWNED).map((a) => a.userId)).toEqual(
      [SEED_ADMIN_ID],
    );
    // ...the forbidden row is left exactly as it was (no partial corruption).
    expect(store.getAssignmentsForJob(SEED_JOB_OTHER).map((a) => a.userId)).toEqual(
      otherBefore,
    );

    // One row mutated ⇒ one update audit row + one bulk_summary.
    const actions = audit.entries.map((e) => e.action);
    expect(actions).toContain("update");
    expect(actions).toContain("bulk_summary");
  });
});

describe("threat model — T16 delete audit gap", () => {
  const audit = createMemoryAuditWriter();

  afterEach(() => {
    audit.reset();
    setAuditWriter(null);
  });

  it("single delete writes exactly one delete audit row with matching entity_id and non-null before", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());
    const ctx = buildCtx(SEED_ADMIN_ID, ["office_admin"], SEED_JOB_OWNED);

    await dal.delete(ctx, SEED_JOB_OWNED);

    expect(store.getJob(SEED_JOB_OWNED)).toBeUndefined();
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      action: "delete",
      tableName: "jobs",
      recordId: SEED_JOB_OWNED,
      moduleId: "job_detail",
      after: null,
    });
    expect(audit.entries[0]?.before).toBeTruthy();
    expect(audit.entries[0]?.before).toMatchObject({
      title: expect.any(String),
      customer_id: SEED_CUSTOMER_ACME,
    });
  });

  it("bulk delete writes one delete audit row per removed entity and optional bulk_summary", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());
    const ctx = buildListCtx(SEED_ADMIN_ID, ["office_admin"]);
    const ids = [SEED_JOB_OWNED, SEED_JOB_OTHER];

    const result = await dal.bulkDelete(ctx, ids, {
      mode: "partial",
      requestId: "threat-t16-bulk",
    });

    expect(result.succeeded).toEqual(ids);
    expect(result.skipped).toHaveLength(0);

    const deleteEntries = audit.entries.filter((e) => e.action === "delete");
    expect(deleteEntries).toHaveLength(2);
    expect(deleteEntries.map((e) => e.recordId).sort()).toEqual([...ids].sort());
    for (const entry of deleteEntries) {
      expect(entry).toMatchObject({
        action: "delete",
        tableName: "jobs",
        moduleId: "job_list",
        after: null,
      });
      expect(entry.before).toBeTruthy();
    }

    expect(audit.entries.some((e) => e.action === "bulk_summary")).toBe(true);
    expect(
      audit.entries.find((e) => e.action === "bulk_summary"),
    ).toMatchObject({
      requestId: "threat-t16-bulk",
      patch: expect.objectContaining({ operation: "delete", succeeded: 2 }),
    });
  });

  it("forbidden single delete writes no delete audit row for that entity", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());
    const ctx = buildCtx(SEED_TECH_ID, ["field_tech"], SEED_JOB_OWNED);

    await expect(dal.delete(ctx, SEED_JOB_OWNED)).rejects.toThrow(ForbiddenError);

    expect(store.getJob(SEED_JOB_OWNED)).toBeDefined();
    expect(audit.entries.filter((e) => e.action === "delete")).toHaveLength(0);
    expect(
      audit.entries.some((e) => e.recordId === SEED_JOB_OWNED),
    ).toBe(false);
  });

  it("bulk delete skips not_found ids without delete audit rows for them", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());
    const ctx = buildListCtx(SEED_ADMIN_ID, ["office_admin"]);
    const missingId = "missing-job-t16";

    const result = await dal.bulkDelete(
      ctx,
      [SEED_JOB_OWNED, missingId],
      { mode: "partial" },
    );

    expect(result.succeeded).toEqual([SEED_JOB_OWNED]);
    expect(result.skipped).toEqual([{ id: missingId, reason: "not_found" }]);

    const deleteEntries = audit.entries.filter((e) => e.action === "delete");
    expect(deleteEntries).toHaveLength(1);
    expect(deleteEntries[0]?.recordId).toBe(SEED_JOB_OWNED);
    expect(deleteEntries.some((e) => e.recordId === missingId)).toBe(false);
  });
});
