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

import { canDeleteRow, deleteRowWithAudit } from "./delete-row.js";
import { patchedFieldIds } from "./patch-utils.js";
import type { StoreAdapter } from "./store-adapter.js";
import type { SurfaceDescriptor } from "./surface-descriptor.js";

const DEFAULT_BULK_MAX_BATCH = 500;

const assertListSurface = <TRow, TRelated>(
  descriptor: SurfaceDescriptor<TRow, TRelated>,
  ctx: PermissionContext,
  method: "bulkUpdate" | "bulkDelete",
): void => {
  if (ctx.manifest.surface !== ctx.surface) {
    throw new Error(
      `PermissionContext surface "${ctx.surface}" does not match manifest.surface "${ctx.manifest.surface}"`,
    );
  }
  if (ctx.surface !== descriptor.surfaceId) {
    throw new Error(
      `${method} requires PermissionContext.surface "${descriptor.surfaceId}", got "${ctx.surface}"`,
    );
  }
  if (!descriptor.capabilities.includes("list")) {
    throw new Error(`${method} requires a list-capable surface descriptor`);
  }
};

type RowPlan<TRow> =
  | { kind: "apply"; id: string; row: TRow & { id: string } }
  | { kind: "skip"; entry: BulkUpdateSkipped };

const classifyUpdateRow = <TRow, TRelated>(
  store: StoreAdapter<TRow, TRelated>,
  ctx: PermissionContext,
  id: string,
  fieldIds: string[],
): RowPlan<TRow> => {
  const row = store.get(id);
  if (
    !row ||
    !store.isRowVisibleToPrincipal(
      id,
      ctx.principal.id,
      ctx.manifest.rowScope,
    )
  ) {
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

  return { kind: "apply", id, row: row as TRow & { id: string } };
};

const applyRowUpdate = <TRow, TRelated>(
  descriptor: SurfaceDescriptor<TRow, TRelated>,
  store: StoreAdapter<TRow, TRelated>,
  id: string,
  row: TRow,
  patch: Record<string, unknown>,
): TRow => {
  const updated = descriptor.applyPatch(row, patch);
  store.upsert(updated);

  const relatedPatch = descriptor.applyRelatedPatch?.(id, patch);
  if (relatedPatch !== undefined) {
    store.replaceRelated(id, relatedPatch);
  }

  return updated;
};

export const bulkUpdate = async <TRow, TRelated>(
  descriptor: SurfaceDescriptor<TRow, TRelated>,
  store: StoreAdapter<TRow, TRelated>,
  ctx: PermissionContext,
  ids: string[],
  patchBody: unknown,
  opts?: BulkUpdateOptions,
): Promise<BulkUpdateResult> => {
  assertListSurface(descriptor, ctx, "bulkUpdate");

  const maxBatch = descriptor.bulkMaxBatch ?? DEFAULT_BULK_MAX_BATCH;
  if (ids.length > maxBatch) {
    throw new ValidationError(
      `Bulk update exceeds maximum batch size of ${maxBatch}`,
      { max: maxBatch, received: ids.length },
    );
  }

  const schema = narrowPatchSchema(descriptor.patchSchema, ctx.manifest);
  const parsed = schema.safeParse(patchBody);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  const patch = parsed.data as Record<string, unknown>;
  const fieldIds = patchedFieldIds(patch);
  const mode = opts?.mode ?? "partial";
  const requestId = opts?.requestId;

  const plans = ids.map((id) => classifyUpdateRow(store, ctx, id, fieldIds));

  const skipped = plans
    .filter(
      (p): p is { kind: "skip"; entry: BulkUpdateSkipped } => p.kind === "skip",
    )
    .map((p) => p.entry);

  const toApply = plans.filter(
    (p): p is { kind: "apply"; id: string; row: TRow & { id: string } } =>
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
    const beforeSnapshot = descriptor.auditSnapshot(row);
    const updated = applyRowUpdate(descriptor, store, id, row, patch);
    const afterSnapshot = descriptor.auditSnapshot(updated);

    await writeAudit({
      actorId: ctx.principal.id,
      action: "update",
      tableName: descriptor.anchorTable,
      recordId: id,
      moduleId: ctx.surface,
      fieldIds,
      before: beforeSnapshot,
      after: afterSnapshot,
      patch,
      requestId,
    });

    succeeded.push(id);
  }

  if (succeeded.length > 0 && requestId !== undefined) {
    await writeAudit({
      actorId: ctx.principal.id,
      action: "bulk_summary",
      tableName: descriptor.anchorTable,
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

const classifyDeleteRow = <TRow, TRelated>(
  store: StoreAdapter<TRow, TRelated>,
  ctx: PermissionContext,
  id: string,
): RowPlan<TRow> => {
  const row = store.get(id);
  if (
    !row ||
    !store.isRowVisibleToPrincipal(
      id,
      ctx.principal.id,
      ctx.manifest.rowScope,
    )
  ) {
    return { kind: "skip", entry: { id, reason: "not_found" } };
  }
  return { kind: "apply", id, row: row as TRow & { id: string } };
};

export const bulkDelete = async <TRow, TRelated>(
  descriptor: SurfaceDescriptor<TRow, TRelated>,
  store: StoreAdapter<TRow, TRelated>,
  ctx: PermissionContext,
  ids: string[],
  opts?: BulkUpdateOptions,
): Promise<BulkUpdateResult> => {
  assertListSurface(descriptor, ctx, "bulkDelete");

  if (!canDeleteRow(descriptor, ctx)) {
    throw new ForbiddenError();
  }

  const maxBatch = descriptor.bulkMaxBatch ?? DEFAULT_BULK_MAX_BATCH;
  if (ids.length > maxBatch) {
    throw new ValidationError(
      `Bulk delete exceeds maximum batch size of ${maxBatch}`,
      { max: maxBatch, received: ids.length },
    );
  }

  const mode = opts?.mode ?? "partial";
  const requestId = opts?.requestId;

  const plans = ids.map((id) => classifyDeleteRow(store, ctx, id));

  const skipped = plans
    .filter(
      (p): p is { kind: "skip"; entry: BulkUpdateSkipped } => p.kind === "skip",
    )
    .map((p) => p.entry);

  const toApply = plans.filter(
    (p): p is { kind: "apply"; id: string; row: TRow & { id: string } } =>
      p.kind === "apply",
  );

  if (mode === "all_or_nothing" && skipped.length > 0) {
    return { succeeded: [], skipped, failed: [] };
  }

  const succeeded: string[] = [];

  for (const { id, row } of toApply) {
    await deleteRowWithAudit(descriptor, store, ctx, row, { requestId });
    succeeded.push(id);
  }

  if (succeeded.length > 0 && requestId !== undefined) {
    await writeAudit({
      actorId: ctx.principal.id,
      action: "bulk_summary",
      tableName: descriptor.anchorTable,
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
