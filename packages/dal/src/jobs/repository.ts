import type { PendingStore } from "@latch/approval";
import { writeAudit } from "@latch/audit";
import {
  fieldAllows,
  ForbiddenError,
  narrowPatchSchema,
  NotFoundError,
  ValidationError,
  type BulkUpdateOptions,
  type BulkUpdateResult,
  type PermissionContext,
} from "@latch/contracts";

import { bulkDelete as runBulkDelete, bulkUpdate as runBulkUpdate } from "./bulk.js";
import {
  applyAssignmentsPatch,
  applyJobPatch,
  jobRowAuditSnapshot,
  patchedFieldIds,
} from "./apply-patch.js";
import type { MemoryJobStore } from "./memory-store.js";
import {
  projectJobListRow,
  type JobListJoins,
  type ProjectedJobListRow,
} from "./list-project.js";
import { canDeleteJob, deleteJobWithAudit } from "./job-delete.js";
import { projectJobRow, type ProjectedJobDetail } from "./project.js";
import {
  JobDetailPatchSchema,
  type JobDetailPatchDto,
  JobListQuerySchema,
  LIST_DEFAULT_PAGE_SIZE,
  type JobListQueryDto,
} from "./schemas.js";

const assertPermissionContext = (ctx: PermissionContext): void => {
  if (ctx.manifest.surface !== ctx.surface) {
    throw new Error(
      `PermissionContext surface "${ctx.surface}" does not match manifest.surface "${ctx.manifest.surface}"`,
    );
  }
};

const assertJobListContext = (ctx: PermissionContext): void => {
  assertPermissionContext(ctx);
  if (ctx.surface !== "job_list") {
    throw new Error(
      `list requires PermissionContext.surface "job_list", got "${ctx.surface}"`,
    );
  }
};

const jobListJoins = (row: {
  customerName?: string;
  siteLabel?: string;
}): JobListJoins => ({
  customerName: row.customerName ?? "",
  siteLabel: row.siteLabel ?? "",
});

const normalizeListQuery = (
  raw: JobListQueryDto | undefined,
): { status?: string; limit: number; offset: number } => ({
  status: raw?.status,
  limit: raw?.limit ?? LIST_DEFAULT_PAGE_SIZE,
  offset: raw?.offset ?? 0,
});

const rowVisibleToPrincipal = (
  ctx: PermissionContext,
  jobId: string,
  store: MemoryJobStore,
): boolean => {
  if (ctx.manifest.rowScope !== "own") {
    return true;
  }
  return store.isUserAssignedToJob(jobId, ctx.principal.id);
};

const financialNeedsPending = (
  ctx: PermissionContext,
  patch: JobDetailPatchDto,
): boolean =>
  patch.financial_terms?.contract_amount !== undefined &&
  !fieldAllows(ctx.manifest, "financial_terms", "write") &&
  fieldAllows(ctx.manifest, "financial_terms", "submit");

const stripFinancialFromPatch = (
  patch: JobDetailPatchDto,
): JobDetailPatchDto => {
  const { financial_terms: _financial, ...rest } = patch;
  return rest;
};

export type JobListResult = {
  rows: ProjectedJobListRow[];
  total: number;
};

export type JobsDal = {
  list: (
    ctx: PermissionContext,
    opts?: JobListQueryDto,
  ) => JobListResult;
  bulkUpdate: (
    ctx: PermissionContext,
    ids: string[],
    patch: unknown,
    opts?: BulkUpdateOptions,
  ) => Promise<BulkUpdateResult>;
  bulkDelete: (
    ctx: PermissionContext,
    ids: string[],
    opts?: BulkUpdateOptions,
  ) => Promise<BulkUpdateResult>;
  get: (ctx: PermissionContext, id: string) => ProjectedJobDetail;
  patch: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<ProjectedJobDetail>;
  acceptPending: (
    ctx: PermissionContext,
    pendingId: string,
  ) => Promise<ProjectedJobDetail>;
  delete: (ctx: PermissionContext, id: string) => Promise<void>;
};

export const createJobsDal = (
  store: MemoryJobStore,
  pendingStore: PendingStore,
): JobsDal => ({
  list: (ctx, rawOpts) => {
    assertJobListContext(ctx);

    const parsed = JobListQuerySchema.safeParse(rawOpts ?? {});
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten());
    }

    const query = normalizeListQuery(parsed.data);
    const { rows, total } = store.listJobs({
      principalId: ctx.principal.id,
      rowScope: ctx.manifest.rowScope ?? "all",
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      rows: rows.map((row) => {
        const assignments = store.getAssignmentsForJob(row.id);
        return projectJobListRow(
          row,
          ctx.manifest,
          assignments,
          jobListJoins(row),
        );
      }),
      total,
    };
  },

  bulkUpdate: (ctx, ids, patch, opts) =>
    runBulkUpdate(store, ctx, ids, patch, opts),

  bulkDelete: (ctx, ids, opts) => runBulkDelete(store, ctx, ids, opts),

  get: (ctx, id) => {
    assertPermissionContext(ctx);

    const row = store.getJob(id);
    if (!row) {
      throw new NotFoundError();
    }

    if (!rowVisibleToPrincipal(ctx, id, store)) {
      throw new NotFoundError();
    }

    const assignments = store.getAssignmentsForJob(id);
    return projectJobRow(row, ctx.manifest, assignments);
  },

  patch: async (ctx, id, body) => {
    assertPermissionContext(ctx);

    const row = store.getJob(id);
    if (!row) {
      throw new NotFoundError();
    }

    if (!rowVisibleToPrincipal(ctx, id, store)) {
      throw new NotFoundError();
    }

    const schema = narrowPatchSchema(JobDetailPatchSchema, ctx.manifest);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten());
    }

    const patch = parsed.data;
    const fieldIds = patchedFieldIds(patch);
    if (fieldIds.length === 0) {
      const assignments = store.getAssignmentsForJob(id);
      return projectJobRow(row, ctx.manifest, assignments);
    }

    if (financialNeedsPending(ctx, patch)) {
      pendingStore.submit({
        surfaceId: ctx.surface,
        entityId: id,
        fieldIds: ["financial_terms"],
        patch: { financial_terms: patch.financial_terms },
        submittedBy: ctx.principal.id,
      });
    }

    const directPatch = financialNeedsPending(ctx, patch)
      ? stripFinancialFromPatch(patch)
      : patch;
    const directFieldIds = patchedFieldIds(directPatch);

    if (directFieldIds.length === 0) {
      const assignments = store.getAssignmentsForJob(id);
      return projectJobRow(row, ctx.manifest, assignments);
    }

    const beforeSnapshot = jobRowAuditSnapshot(row);
    const updated = applyJobPatch(row, directPatch);
    store.upsertJob(updated);

    const assignmentPatch = applyAssignmentsPatch(id, directPatch);
    if (assignmentPatch !== undefined) {
      store.replaceAssignmentsForJob(id, assignmentPatch);
    }

    const afterSnapshot = jobRowAuditSnapshot(updated);

    await writeAudit({
      actorId: ctx.principal.id,
      action: "update",
      tableName: "jobs",
      recordId: id,
      moduleId: ctx.surface,
      fieldIds: directFieldIds,
      before: beforeSnapshot,
      after: afterSnapshot,
      patch: directPatch as Record<string, unknown>,
    });

    const assignments = store.getAssignmentsForJob(id);
    return projectJobRow(updated, ctx.manifest, assignments);
  },

  acceptPending: async (ctx, pendingId) => {
    assertPermissionContext(ctx);

    const pending = pendingStore.getById(pendingId);
    if (!pending || pending.status !== "submitted") {
      throw new NotFoundError();
    }

    if (pending.surfaceId !== ctx.surface) {
      throw new NotFoundError();
    }

    for (const fieldId of pending.fieldIds) {
      if (!fieldAllows(ctx.manifest, fieldId, "approve")) {
        throw new ForbiddenError();
      }
    }

    const id = pending.entityId;
    const row = store.getJob(id);
    if (!row) {
      throw new NotFoundError();
    }

    if (!rowVisibleToPrincipal(ctx, id, store)) {
      throw new NotFoundError();
    }

    const patch = pending.patch as JobDetailPatchDto;
    const fieldIds = patchedFieldIds(patch);
    if (fieldIds.length === 0) {
      throw new ValidationError("Pending change has no fields to apply");
    }

    const beforeSnapshot = jobRowAuditSnapshot(row);
    const updated = applyJobPatch(row, patch);
    store.upsertJob(updated);

    const assignmentPatch = applyAssignmentsPatch(id, patch);
    if (assignmentPatch !== undefined) {
      store.replaceAssignmentsForJob(id, assignmentPatch);
    }

    pendingStore.resolve(pendingId, {
      status: "accepted",
      decidedBy: ctx.principal.id,
    });

    const afterSnapshot = jobRowAuditSnapshot(updated);

    await writeAudit({
      actorId: ctx.principal.id,
      action: "approve",
      tableName: "jobs",
      recordId: id,
      moduleId: ctx.surface,
      fieldIds,
      before: beforeSnapshot,
      after: afterSnapshot,
      patch: patch as Record<string, unknown>,
      approvalId: pendingId,
    });

    const assignments = store.getAssignmentsForJob(id);
    return projectJobRow(updated, ctx.manifest, assignments);
  },

  delete: async (ctx, id) => {
    assertPermissionContext(ctx);

    if (!canDeleteJob(ctx)) {
      throw new ForbiddenError();
    }

    const row = store.getJob(id);
    if (!row) {
      throw new NotFoundError();
    }

    if (!rowVisibleToPrincipal(ctx, id, store)) {
      throw new NotFoundError();
    }

    await deleteJobWithAudit(store, ctx, row);
  },
});
