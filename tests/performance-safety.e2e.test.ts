import { afterEach, describe, expect, it, vi } from "vitest";

import { createMemoryAuditWriter, setAuditWriter } from "@latch/audit";
import { ForbiddenError } from "@latch/contracts";
import {
  bumpPolicyVersionForPrincipal,
  createJobPolicyService,
  createSeededJobsDal,
  jobDetailScope,
  principalFromStore,
  revokeRoleForUser,
  SEED_ADMIN_ID,
  SEED_JOB_OWNED,
  SEED_TECH_ID,
} from "@latch/crm/test-utils";
import {
  createCachingPolicyService,
  createMapManifestCacheStore,
} from "@latch/policy";

describe("performance & safety — Phase 06 e2e", () => {
  const audit = createMemoryAuditWriter();

  afterEach(() => {
    audit.reset();
    setAuditWriter(null);
    vi.restoreAllMocks();
  });

  describe("manifest cache read path", () => {
    it("two job_detail resolves in one request scope call inner resolve once", () => {
      const inner = createJobPolicyService();
      const map = new Map();
      const caching = createCachingPolicyService(
        inner,
        { mode: "request" },
        createMapManifestCacheStore(map),
      );
      const scope = jobDetailScope(SEED_JOB_OWNED);
      const principal = {
        id: SEED_TECH_ID,
        roles: ["field_tech"],
        policyVersion: 1,
      };

      const spy = vi.spyOn(inner, "resolve");
      caching.resolve(principal, scope);
      caching.resolve(principal, scope);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("T3 — revoke / policyVersion invalidates write", () => {
    it("field_tech: cached read → revoke role → fresh PATCH → 403", async () => {
      setAuditWriter(audit.writer);
      const { store, dal } = createSeededJobsDal();
      const inner = createJobPolicyService();
      const map = new Map();
      const caching = createCachingPolicyService(
        inner,
        { mode: "request" },
        createMapManifestCacheStore(map),
      );
      const scope = jobDetailScope(SEED_JOB_OWNED);

      const beforeRevoke = await principalFromStore(store, SEED_TECH_ID, {
        policyVersion: 1,
      });
      const cachedManifest = caching.resolve(beforeRevoke, scope);
      expect(cachedManifest.fields.financial_terms).toContain("submit");

      revokeRoleForUser(store, SEED_TECH_ID, "field_tech");

      const afterRevoke = await principalFromStore(store, SEED_TECH_ID, {
        policyVersion: 2,
      });
      expect(afterRevoke.roles).not.toContain("field_tech");

      const freshManifest = caching.resolve(afterRevoke, scope, {
        bypassCache: true,
      });
      expect(freshManifest.fields.financial_terms ?? []).not.toContain("submit");

      const freshCtx = {
        principal: afterRevoke,
        manifest: freshManifest,
        surface: "job_detail" as const,
      };

      try {
        await dal.patch(freshCtx, SEED_JOB_OWNED, {
          financial_terms: { contract_amount: "15000.00" },
        });
        expect.fail("expected fresh PATCH after revoke to be denied");
      } catch (error) {
        expect(error).toBeDefined();
        expect(
          (error as { statusCode?: number }).statusCode,
          "write must not succeed after IAM revoke (403 forbidden or strict validation)",
        ).toBeGreaterThanOrEqual(400);
        expect((error as { statusCode?: number }).statusCode).toBeLessThan(500);
      }

      expect(store.getJob(SEED_JOB_OWNED)?.contractAmount).toBe("12500.00");
      expect(audit.entries).toHaveLength(0);
    });

    it("office_admin: cached read → revoke role → fresh delete → 403", async () => {
      setAuditWriter(audit.writer);
      const { store, dal } = createSeededJobsDal();
      const inner = createJobPolicyService();
      const map = new Map();
      const caching = createCachingPolicyService(
        inner,
        { mode: "request" },
        createMapManifestCacheStore(map),
      );
      const scope = jobDetailScope(SEED_JOB_OWNED);

      const beforeRevoke = await principalFromStore(store, SEED_ADMIN_ID, {
        policyVersion: 1,
      });
      const cachedManifest = caching.resolve(beforeRevoke, scope);
      expect(cachedManifest.actions).toContain("delete");

      revokeRoleForUser(store, SEED_ADMIN_ID, "office_admin");

      const afterRevoke = await principalFromStore(store, SEED_ADMIN_ID, {
        policyVersion: 2,
      });
      const freshManifest = caching.resolve(afterRevoke, scope, {
        bypassCache: true,
      });
      expect(freshManifest.actions).not.toContain("delete");

      const freshCtx = {
        principal: afterRevoke,
        manifest: freshManifest,
        surface: "job_detail" as const,
      };

      await expect(dal.delete(freshCtx, SEED_JOB_OWNED)).rejects.toThrow(
        ForbiddenError,
      );
      expect(store.getJob(SEED_JOB_OWNED)).toBeDefined();
      expect(audit.entries.filter((e) => e.action === "delete")).toHaveLength(0);
    });

    it("policyVersion bump: stale cache generation not returned after version changes", () => {
      const inner = createJobPolicyService();
      const map = new Map();
      const cacheStore = createMapManifestCacheStore(map);
      const caching = createCachingPolicyService(
        inner,
        { mode: "request" },
        cacheStore,
      );
      const scope = jobDetailScope(SEED_JOB_OWNED);
      const v1 = { id: SEED_TECH_ID, roles: ["field_tech"], policyVersion: 1 };

      const spy = vi.spyOn(inner, "resolve");
      caching.resolve(v1, scope);

      cacheStore.deleteByVersion(1);

      const v2 = bumpPolicyVersionForPrincipal(v1);
      const second = caching.resolve(v2, scope);

      expect(spy).toHaveBeenCalledTimes(2);
      expect(second.policyVersion).toBe(2);
    });
  });
});
