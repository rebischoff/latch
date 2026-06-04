import {
  createMemoryAuditWriter,
  setAuditWriter,
  type AuditWriter,
} from "@latch/audit";
import type { Manifest, PermissionContext, PolicyScope, Principal } from "@latch/contracts";
import {
  createMemoryPendingStore,
  createPostgresPendingStore,
  type PendingChange,
  type PendingStatus,
  type PendingStore,
} from "@latch/approval";
import {
  createCachingPolicyService,
  manifestCacheKey,
  parseManifestCacheKey,
  PolicyService,
} from "@latch/policy";
import { cache } from "react";

import { SEED_CUSTOMER_ACME, SEED_CUSTOMER_OAK } from "../../db/seed.js";
import { getPilotStore } from "@/lib/pilot-store";
import {
  createCustomersDal,
  type CustomersDal,
} from "./customers/repository.js";
import { createIamDal, type IamDal } from "./iam/repository.js";
import { createJobsDal, type JobsDal } from "./jobs/repository.js";
import { jobPolicyRegistry } from "./policy/registry.js";

import { createPostgresAuditWriter } from "@/lib/audit-db-writer";
import { getPrincipal } from "@/lib/auth/getPrincipal";
import { getDatabaseUrl } from "@/lib/db";
import { getManifestCacheMode } from "@/lib/latch-config";
import { getRequestManifestCacheStore } from "@/lib/manifest-request-scope";

export const innerPolicyService = new PolicyService({
  registry: jobPolicyRegistry,
});

const getRequestPrincipal = cache(getPrincipal);

const scopeFromInput = (input: ResolveContextInput): PolicyScope => {
  switch (input.surfaceId) {
    case "job_detail":
      return {
        surface: "job_detail",
        entityId: input.entityId,
        mode: "detail",
      };
    case "customer_detail":
      return {
        surface: "customer_detail",
        entityId: input.entityId,
        mode: "detail",
      };
    case "user_roles_detail":
      return {
        surface: "user_roles_detail",
        entityId: input.entityId,
        mode: "detail",
      };
    case "job_list":
      return { surface: "job_list", mode: "list" };
    default: {
      const _exhaustive: never = input;
      return _exhaustive;
    }
  }
};

const policyScopeFromCacheKey = (key: string): PolicyScope => {
  const parts = parseManifestCacheKey(key);
  return {
    surface: parts.surfaceId,
    ...(parts.mode !== undefined ? { mode: parts.mode } : {}),
    ...(parts.entityId !== undefined ? { entityId: parts.entityId } : {}),
  };
};

const resolveManifestWithCache = (
  principal: Principal,
  scope: PolicyScope,
  bypassCache: boolean,
): Manifest => {
  const mode = getManifestCacheMode();
  const policyService = createCachingPolicyService(
    innerPolicyService,
    { mode },
    mode === "request" ? getRequestManifestCacheStore() : undefined,
  );

  return policyService.resolve(
    principal,
    scope,
    bypassCache ? { bypassCache: true } : undefined,
  );
};

const resolveManifestForRequest = cache(
  async (cacheKey: string, bypassCache: boolean): Promise<Manifest> => {
    const principal = await getRequestPrincipal();
    const scope = policyScopeFromCacheKey(cacheKey);
    if (manifestCacheKey(principal, scope) !== cacheKey) {
      throw new Error("Manifest cache key mismatch for principal/scope");
    }
    return resolveManifestWithCache(principal, scope, bypassCache);
  },
);

type LatchPilotGlobal = {
  jobsDal?: JobsDal;
  customersDal?: CustomersDal;
  iamDal?: IamDal;
  auditWriter?: AuditWriter;
  pendingStore?: PendingStore;
};

const pilotGlobal = (): LatchPilotGlobal => {
  const root = globalThis as typeof globalThis & {
    __latchCrmPilot?: LatchPilotGlobal;
  };
  if (!root.__latchCrmPilot) {
    root.__latchCrmPilot = {};
  }
  return root.__latchCrmPilot;
};

/** Re-apply writer after HMR can reset the `@latch/audit` module singleton. */
const ensureAuditWriter = (): void => {
  const g = pilotGlobal();
  if (!g.auditWriter) {
    const databaseUrl = getDatabaseUrl();
    g.auditWriter = databaseUrl
      ? createPostgresAuditWriter(databaseUrl).writer
      : createMemoryAuditWriter().writer;
  }
  setAuditWriter(g.auditWriter);
};

const ensurePendingStore = (): PendingStore => {
  const g = pilotGlobal();
  if (!g.pendingStore) {
    const databaseUrl = getDatabaseUrl();
    g.pendingStore = databaseUrl
      ? createPostgresPendingStore(databaseUrl).store
      : createMemoryPendingStore();
  }
  return g.pendingStore;
};

/** Recreate when HMR reloads domain modules but the global pilot cache still holds a stale DAL. */
const ensureJobsDal = (): JobsDal => {
  const g = pilotGlobal();
  ensureAuditWriter();
  const store = getPilotStore();
  if (!g.jobsDal || typeof g.jobsDal.list !== "function") {
    g.jobsDal = createJobsDal(store, ensurePendingStore());
  }
  return g.jobsDal;
};

export const getJobsDal = (): JobsDal => ensureJobsDal();

export const getPendingStore = (): PendingStore => ensurePendingStore();

export const getPendingById = async (
  id: string,
): Promise<PendingChange | undefined> => getPendingStore().getById(id);

export const getPendingForEntity = async (
  entityId: string,
  filter?: { surfaceId?: string; status?: PendingStatus },
): Promise<PendingChange[]> =>
  getPendingStore().getPendingForEntity(entityId, filter);

/** Vitest: drop cached DAL/store so each test gets a fresh in-memory pending queue. */
export const resetLatchPilotCachesForTests = (): void => {
  const g = pilotGlobal();
  g.pendingStore = undefined;
  g.jobsDal = undefined;
};

const ensureCustomersDal = (): CustomersDal => {
  const g = pilotGlobal();
  const store = getPilotStore();
  if (!g.customersDal) {
    g.customersDal = createCustomersDal(store);
  }
  return g.customersDal;
};

export const getCustomersDal = (): CustomersDal => ensureCustomersDal();

const ensureIamDal = (): IamDal => {
  const g = pilotGlobal();
  ensureAuditWriter();
  const store = getPilotStore();
  if (!g.iamDal) {
    g.iamDal = createIamDal(store);
  }
  return g.iamDal;
};

export const getIamDal = (): IamDal => ensureIamDal();

/** Stable customer ids for manual QA (`/customers?id=`). */
export { SEED_CUSTOMER_ACME, SEED_CUSTOMER_OAK };

export type ResolveContextInput =
  | { surfaceId: "job_detail"; entityId: string }
  | { surfaceId: "job_list" }
  | { surfaceId: "customer_detail"; entityId: string }
  | { surfaceId: "user_roles_detail"; entityId: string };

export type ResolveContextOptions = {
  /**
   * Mutations must bypass the read cache (`stalePolicyOnWrite: recheck`).
   * Prefer {@link resolveContextFresh} at mutation call sites.
   */
  bypassCache?: boolean;
};

const resolveContextImpl = async (
  input: ResolveContextInput,
  options?: ResolveContextOptions,
): Promise<PermissionContext> => {
  const principal = await getRequestPrincipal();
  const scope = scopeFromInput(input);
  const cacheKey = manifestCacheKey(principal, scope);
  const manifest = await resolveManifestForRequest(
    cacheKey,
    options?.bypassCache ?? false,
  );

  return {
    principal,
    manifest,
    surface: input.surfaceId,
  };
};

/** Resolves principal + manifest for reads; caches per request when `manifestCacheMode: request`. */
export const resolveContext = async (
  input: ResolveContextInput,
  options?: ResolveContextOptions,
): Promise<PermissionContext> => resolveContextImpl(input, options);

/** Fresh manifest for mutations (never uses the read cache). */
export const resolveContextFresh = async (
  input: ResolveContextInput,
): Promise<PermissionContext> => resolveContext(input, { bypassCache: true });
