import type { PendingStore } from "@latch/approval";
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
import {
  assertVerificationDirectWrite,
  splitVerificationPatch,
} from "./pending-routing.js";
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

const classifyUpdateRow = async <TRow, TRelated>(
  store: StoreAdapter<TRow, TRelated>,
  ctx: PermissionContext,
  pendingStore: PendingStore | undefined,
  id: string,
  directFieldIds: string[],
  pendingFieldIds: string[],
): Promise<RowPlan<TRow>> => {
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

  const deniedDirect = directFieldIds.filter(
    (fieldId) => !fieldAllows(ctx.manifest, fieldId, "write"),
  );
  if (deniedDirect.length > 0) {
    return {
      kind: "skip",
      entry: {
        id,
        reason: "forbidden_field",
        detail: { fields: deniedDirect },
      },
    };
  }

  if (pendingFieldIds.length > 0) {
    const open = await pendingStore!.getPendingForEntity(id, {
      surfaceId: ctx.surface,
      status: "submitted",
    });
    if (open.length > 0) {
      return { kind: "skip", entry: { id, reason: "forbidden_row" } };
    }
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
  pendingStore?: PendingStore,
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
  const { directPatch, pendingPatch, pendingFieldIds } = splitVerificationPatch(
    ctx,
    patch,
    descriptor.verificationFieldIds,
  );
  const directFieldIds = patchedFieldIds(directPatch);
  const mode = opts?.mode ?? "partial";
  const requestId = opts?.requestId;

  if (pendingFieldIds.length > 0 && !pendingStore) {
    throw new ForbiddenError();
  }

  const plans = await Promise.all(
    ids.map((id) =>
      classifyUpdateRow(
        store,
        ctx,
        pendingStore,
        id,
        directFieldIds,
        pendingFieldIds,
      ),
    ),
  );

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

  if (directFieldIds.length === 0 && pendingFieldIds.length === 0) {
    return {
      succeeded: toApply.map((p) => p.id),
      skipped,
      failed: [],
    };
  }

  const batchId =
    pendingFieldIds.length > 0 ? crypto.randomUUID() : undefined;
  const succeeded: string[] = [];

  for (const { id, row } of toApply) {
    let changed = false;

    if (directFieldIds.length > 0) {
      assertVerificationDirectWrite(
        ctx,
        directPatch,
        descriptor.verificationFieldIds,
      );

      const beforeSnapshot = descriptor.auditSnapshot(row);
      const updated = applyRowUpdate(descriptor, store, id, row, directPatch);
      const afterSnapshot = descriptor.auditSnapshot(updated);

      await writeAudit({
        actorId: ctx.principal.id,
        action: "update",
        tableName: descriptor.anchorTable,
        recordId: id,
        moduleId: ctx.surface,
        fieldIds: directFieldIds,
        before: beforeSnapshot,
        after: afterSnapshot,
        patch: directPatch,
        requestId,
      });

      changed = true;
    }

    if (pendingFieldIds.length > 0) {
      await pendingStore!.submit({
        surfaceId: ctx.surface,
        entityId: id,
        fieldIds: [...pendingFieldIds],
        patch: pendingPatch,
        submittedBy: ctx.principal.id,
        batchId,
      });
      changed = true;
    }

    if (changed) {
      succeeded.push(id);
    }
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
        fieldIds: patchedFieldIds(patch),
        ...(batchId !== undefined ? { batch_id: batchId } : {}),
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
