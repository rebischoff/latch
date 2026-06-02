import { writeAudit } from "@latch/audit";
import {
  fieldAllows,
  ForbiddenError,
  narrowPatchSchema,
  ValidationError,
  type BulkUpdateOptions,
  type BulkUpdateResult,
  type BulkUpdateSkipped,
  type PermissionContext,
} from "@latch/contracts";

import {
  applyAssignmentsPatch,
  applyJobPatch,
  jobRowAuditSnapshot,
  patchedFieldIds,
} from "./apply-patch.js";
import type { MemoryJobStore } from "./memory-store.js";
import type { MemoryJobRecord } from "./memory-store.js";
import { canDeleteJob, deleteJobWithAudit } from "./job-delete.js";
import {
  BULK_MAX_BATCH,
  JobListPatchSchema,
  type JobListPatchDto,
} from "./schemas.js";

const assertJobListContext = (
  ctx: PermissionContext,
  method: "bulkUpdate" | "bulkDelete",
): void => {
  if (ctx.manifest.surface !== ctx.surface) {
    throw new Error(
      `PermissionContext surface "${ctx.surface}" does not match manifest.surface "${ctx.manifest.surface}"`,
    );
  }
  if (ctx.surface !== "job_list") {
    throw new Error(
      `${method} requires PermissionContext.surface "job_list", got "${ctx.surface}"`,
    );
  }
};

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

type RowPlan =
  | { kind: "apply"; id: string; row: MemoryJobRecord }
  | { kind: "skip"; entry: BulkUpdateSkipped };

const classifyRow = (
  ctx: PermissionContext,
  id: string,
  patch: JobListPatchDto,
  fieldIds: string[],
  store: MemoryJobStore,
): RowPlan => {
  const row = store.getJob(id);
  if (!row || !rowVisibleToPrincipal(ctx, id, store)) {
    return { kind: "skip", entry: { id, reason: "not_found" } };
  }

  const deniedFields = fieldIds.filter(
    (fieldId) => !fieldAllows(ctx.manifest, fieldId, "write"),
  );
  if (deniedFields.length > 0) {
    return {
      kind: "skip",
      entry: {
        id,
        reason: "forbidden_field",
        detail: { fields: deniedFields },
      },
    };
  }

  return { kind: "apply", id, row };
};

const applyRowUpdate = (
  store: MemoryJobStore,
  id: string,
  row: MemoryJobRecord,
  patch: JobListPatchDto,
): MemoryJobRecord => {
  const updated = applyJobPatch(row, patch);
  store.upsertJob(updated);

  const assignmentPatch = applyAssignmentsPatch(id, patch);
  if (assignmentPatch !== undefined) {
    store.replaceAssignmentsForJob(id, assignmentPatch);
  }

  return updated;
};

export const bulkUpdate = async (
  store: MemoryJobStore,
  ctx: PermissionContext,
  ids: string[],
  patchBody: unknown,
  opts?: BulkUpdateOptions,
): Promise<BulkUpdateResult> => {
  assertJobListContext(ctx, "bulkUpdate");

  if (ids.length > BULK_MAX_BATCH) {
    throw new ValidationError(
      `Bulk update exceeds maximum batch size of ${BULK_MAX_BATCH}`,
      { max: BULK_MAX_BATCH, received: ids.length },
    );
  }

  const schema = narrowPatchSchema(JobListPatchSchema, ctx.manifest);
  const parsed = schema.safeParse(patchBody);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  const patch = parsed.data;
  const fieldIds = patchedFieldIds(patch);
  const mode = opts?.mode ?? "partial";
  const requestId = opts?.requestId;

  const plans = ids.map((id) =>
    classifyRow(ctx, id, patch, fieldIds, store),
  );

  const skipped = plans
    .filter((p): p is { kind: "skip"; entry: BulkUpdateSkipped } => p.kind === "skip")
    .map((p) => p.entry);

  const toApply = plans.filter(
    (p): p is { kind: "apply"; id: string; row: MemoryJobRecord } =>
      p.kind === "apply",
  );

  if (mode === "all_or_nothing" && skipped.length > 0) {
    return { succeeded: [], skipped, failed: [] };
  }

  if (fieldIds.length === 0) {
    return {
      succeeded: toApply.map((p) => p.id),
      skipped,
      failed: [],
    };
  }

  const succeeded: string[] = [];

  for (const { id, row } of toApply) {
    const beforeSnapshot = jobRowAuditSnapshot(row);
    const updated = applyRowUpdate(store, id, row, patch);
    const afterSnapshot = jobRowAuditSnapshot(updated);

    await writeAudit({
      actorId: ctx.principal.id,
      action: "update",
      tableName: "jobs",
      recordId: id,
      moduleId: ctx.surface,
      fieldIds,
      before: beforeSnapshot,
      after: afterSnapshot,
      patch: patch as Record<string, unknown>,
      requestId,
    });

    succeeded.push(id);
  }

  if (succeeded.length > 0 && requestId !== undefined) {
    await writeAudit({
      actorId: ctx.principal.id,
      action: "bulk_summary",
      tableName: "jobs",
      recordId: requestId,
      moduleId: ctx.surface,
      patch: {
        mode,
        succeeded: succeeded.length,
        skipped: skipped.length,
        failed: 0,
        fieldIds,
      },
      requestId,
    });
  }

  return { succeeded, skipped, failed: [] };
};

type DeleteRowPlan =
  | { kind: "apply"; id: string; row: MemoryJobRecord }
  | { kind: "skip"; entry: BulkUpdateSkipped };

const classifyDeleteRow = (
  ctx: PermissionContext,
  id: string,
  store: MemoryJobStore,
): DeleteRowPlan => {
  const row = store.getJob(id);
  if (!row || !rowVisibleToPrincipal(ctx, id, store)) {
    return { kind: "skip", entry: { id, reason: "not_found" } };
  }
  return { kind: "apply", id, row };
};

export const bulkDelete = async (
  store: MemoryJobStore,
  ctx: PermissionContext,
  ids: string[],
  opts?: BulkUpdateOptions,
): Promise<BulkUpdateResult> => {
  assertJobListContext(ctx, "bulkDelete");

  if (!canDeleteJob(ctx)) {
    throw new ForbiddenError();
  }

  if (ids.length > BULK_MAX_BATCH) {
    throw new ValidationError(
      `Bulk delete exceeds maximum batch size of ${BULK_MAX_BATCH}`,
      { max: BULK_MAX_BATCH, received: ids.length },
    );
  }

  const mode = opts?.mode ?? "partial";
  const requestId = opts?.requestId;

  const plans = ids.map((id) => classifyDeleteRow(ctx, id, store));

  const skipped = plans
    .filter((p): p is { kind: "skip"; entry: BulkUpdateSkipped } => p.kind === "skip")
    .map((p) => p.entry);

  const toApply = plans.filter(
    (p): p is { kind: "apply"; id: string; row: MemoryJobRecord } =>
      p.kind === "apply",
  );

  if (mode === "all_or_nothing" && skipped.length > 0) {
    return { succeeded: [], skipped, failed: [] };
  }

  const succeeded: string[] = [];

  for (const { id, row } of toApply) {
    await deleteJobWithAudit(store, ctx, row, { requestId });
    succeeded.push(id);
  }

  if (succeeded.length > 0 && requestId !== undefined) {
    await writeAudit({
      actorId: ctx.principal.id,
      action: "bulk_summary",
      tableName: "jobs",
      recordId: requestId,
      moduleId: ctx.surface,
      patch: {
        mode,
        succeeded: succeeded.length,
        skipped: skipped.length,
        failed: 0,
        operation: "delete",
      },
      requestId,
    });
  }

  return { succeeded, skipped, failed: [] };
};
