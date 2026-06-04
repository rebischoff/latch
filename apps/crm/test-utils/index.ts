import { createMemoryPendingStore } from "@latch/approval";
import {
  restoreFromAuditEntry,
  createMemoryAuditWriter,
  setAuditWriter,
  type StoredAuditEntry,
} from "@latch/audit";
import type {
  Manifest,
  PermissionContext,
  PolicyScope,
  Principal,
} from "@latch/contracts";
import { PolicyService } from "@latch/policy";

import { MemoryJobStore } from "../db/memory-store.js";
import { loadRolesForUser } from "../src/lib/iam/load-roles.js";
import {
  SEED_ADMIN_ID,
  SEED_IAM_ID,
  SEED_CUSTOMER_ACME,
  SEED_CUSTOMER_OAK,
  SEED_JOB_OTHER,
  SEED_JOB_OWNED,
  SEED_SITE_ACME_MAIN,
  SEED_SITE_OAK_AVE,
  SEED_TECH_ID,
  seedPilotJobs,
} from "../db/seed.js";
import {
  createCustomersDal,
  type CustomersDal,
} from "../src/lib/customers/repository.js";
import { createJobsDal, type JobsDal } from "../src/lib/jobs/repository.js";
import { jobPolicyRegistry } from "../src/lib/policy/registry.js";
import { createCrmRestoreDeps } from "../src/lib/restore/replay.js";

export {
  SEED_ADMIN_ID,
  SEED_IAM_ID,
  SEED_CUSTOMER_ACME,
  SEED_CUSTOMER_OAK,
  SEED_JOB_OTHER,
  SEED_JOB_OWNED,
  SEED_SITE_ACME_MAIN,
  SEED_SITE_OAK_AVE,
  SEED_TECH_ID,
  seedPilotJobs,
};
export { MemoryJobStore } from "../db/memory-store.js";
export { createCustomersDal, type CustomersDal };
export { createJobsDal, type JobsDal };
export type { ProjectedCustomerDetail } from "../src/lib/customers/project.js";
export type { ProjectedJobDetail } from "../src/lib/jobs/project.js";
export type { ProjectedJobListRow } from "../src/lib/jobs/list-project.js";

export const createJobPolicyService = (): PolicyService =>
  new PolicyService({ registry: jobPolicyRegistry });

/** Principal with roles loaded from `latch_user_roles` (memory store or Postgres facade). */
export const principalFromStore = async (
  store: MemoryJobStore,
  userId: string,
  options?: { policyVersion?: number },
): Promise<Principal> => ({
  id: userId,
  roles: await loadRolesForUser(userId, store),
  ...(options?.policyVersion !== undefined
    ? { policyVersion: options.policyVersion }
    : {}),
});

/** Simulate IAM revoke mid-scenario (memory pilot / threat tests). */
export const revokeRoleForUser = (
  store: MemoryJobStore,
  userId: string,
  roleId: string,
): void => {
  store.removeUserRole(userId, roleId);
};

/** Simulate `bumpPolicyVersion` after IAM change when Postgres is unavailable. */
export const bumpPolicyVersionForPrincipal = (
  principal: Principal,
): Principal => ({
  ...principal,
  policyVersion: (principal.policyVersion ?? 1) + 1,
});

/** Resolve a manifest for a user whose roles come from the store (no session cookies). */
export const resolveManifestFromStore = async (
  store: MemoryJobStore,
  userId: string,
  scope: PolicyScope,
  policy: PolicyService = createJobPolicyService(),
): Promise<{ principal: Principal; manifest: Manifest }> => {
  const principal = await principalFromStore(store, userId);
  const manifest = policy.resolve(principal, scope);
  return { principal, manifest };
};

export type SeededJobsDal = {
  store: MemoryJobStore;
  dal: JobsDal;
  pendingStore: ReturnType<typeof createMemoryPendingStore>;
};

export const createSeededJobsDal = (): SeededJobsDal => {
  const store = new MemoryJobStore();
  seedPilotJobs(store);
  const pendingStore = createMemoryPendingStore();
  return {
    store,
    dal: createJobsDal(store, pendingStore),
    pendingStore,
  };
};

/** Add `count` jobs on Acme; default assignee is `SEED_ADMIN_ID`. */
export const seedBulkJobs = (
  store: MemoryJobStore,
  count: number,
  options?: { prefix?: string; assigneeId?: string },
): string[] => {
  const prefix = options?.prefix ?? "seed-bulk-job";
  const assigneeId = options?.assigneeId ?? SEED_ADMIN_ID;
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `${prefix}-${i}`;
    ids.push(id);
    store.upsertJob({
      id,
      title: `Bulk job ${i}`,
      status: "scheduled",
      scheduledAt: new Date("2026-05-01T12:00:00.000Z"),
      description: null,
      contractAmount: "1000.00",
      customerId: SEED_CUSTOMER_ACME,
    });
    store.addAssignment({ jobId: id, userId: assigneeId });
  }
  return ids;
};

export const jobDetailScope = (entityId: string): PolicyScope => ({
  surface: "job_detail",
  entityId,
  mode: "detail",
});

export const jobListScope = (): PolicyScope => ({
  surface: "job_list",
  mode: "list",
});

const toJobDetailCtx = (resolved: {
  principal: Principal;
  manifest: Manifest;
}): PermissionContext => ({
  principal: resolved.principal,
  manifest: resolved.manifest,
  surface: "job_detail",
});

const toJobListCtx = (resolved: {
  principal: Principal;
  manifest: Manifest;
}): PermissionContext => ({
  principal: resolved.principal,
  manifest: resolved.manifest,
  surface: "job_list",
});

/** `office_admin` on `job_detail` with roles from the store (includes `delete` + `restore`). */
export const resolveOfficeAdminJobDetailCtx = async (
  store: MemoryJobStore,
  entityId: string,
  policy: PolicyService = createJobPolicyService(),
): Promise<PermissionContext> =>
  toJobDetailCtx(
    await resolveManifestFromStore(
      store,
      SEED_ADMIN_ID,
      jobDetailScope(entityId),
      policy,
    ),
  );

/** `field_tech` on `job_detail` with row-scope `own` from store assignments. */
export const resolveFieldTechJobDetailCtx = async (
  store: MemoryJobStore,
  entityId: string,
  policy: PolicyService = createJobPolicyService(),
): Promise<PermissionContext> =>
  toJobDetailCtx(
    await resolveManifestFromStore(
      store,
      SEED_TECH_ID,
      jobDetailScope(entityId),
      policy,
    ),
  );

export const resolveOfficeAdminJobListCtx = async (
  store: MemoryJobStore,
  policy: PolicyService = createJobPolicyService(),
): Promise<PermissionContext> =>
  toJobListCtx(
    await resolveManifestFromStore(store, SEED_ADMIN_ID, jobListScope(), policy),
  );

/** `field_tech` on `job_list` with row-scope `own` from store assignments. */
export const resolveFieldTechJobListCtx = async (
  store: MemoryJobStore,
  policy: PolicyService = createJobPolicyService(),
): Promise<PermissionContext> =>
  toJobListCtx(
    await resolveManifestFromStore(store, SEED_TECH_ID, jobListScope(), policy),
  );

export type SeededJobsDalWithAudit = SeededJobsDal & {
  audit: ReturnType<typeof createMemoryAuditWriter>;
};

/** Pilot seed + DAL + pending store + in-memory audit writer (no Auth.js / HTTP). */
export const createSeededJobsDalWithAudit = (): SeededJobsDalWithAudit => {
  const audit = createMemoryAuditWriter();
  setAuditWriter(audit.writer);
  const seeded = createSeededJobsDal();
  return { ...seeded, audit };
};

/** Operator restore path: replay delete `before` from a catalogued audit row id. */
export const restoreJobFromDeleteAuditRow = async (
  store: MemoryJobStore,
  auditId: string,
  ctx: PermissionContext,
  catalog: Map<string, StoredAuditEntry>,
): Promise<void> =>
  restoreFromAuditEntry(auditId, ctx, {
    getAuditEntry: (id) => catalog.get(id) ?? null,
    ...createCrmRestoreDeps(store),
  });
