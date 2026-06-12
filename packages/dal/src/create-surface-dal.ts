import type { PendingChange, PendingStore } from "@latch/approval";
import { writeAudit } from "@latch/audit";
import {
  fieldAllows,
  ConflictError,
  ForbiddenError,
  narrowPatchSchema,
  NotFoundError,
  ValidationError,
  type BulkUpdateOptions,
  type BulkUpdateResult,
  type PermissionContext,
} from "@latch/contracts";

import { bulkDelete, bulkUpdate } from "./bulk.js";
import { canDeleteRow, deleteRowWithAudit } from "./delete-row.js";
import {
  assertVerificationDirectWrite,
  splitVerificationPatch,
} from "./pending-routing.js";
import { patchedFieldIds } from "./patch-utils.js";
import { projectRow } from "./project.js";
import type { StoreAdapter } from "./store-adapter.js";
import type { SurfaceDescriptor } from "./surface-descriptor.js";

export type SurfaceDalDeps = {
  pendingStore?: PendingStore;
};

export type SurfaceDal = {
  get: (
    ctx: PermissionContext,
    id: string,
  ) => Promise<Record<string, unknown>>;
  list?: (
    ctx: PermissionContext,
    opts?: Record<string, unknown>,
  ) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
  patch: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
  acceptPending?: (
    ctx: PermissionContext,
    pendingId: string,
  ) => Promise<Record<string, unknown>>;
  rejectPending?: (
    ctx: PermissionContext,
    pendingId: string,
    opts?: { comment?: string },
  ) => Promise<void>;
  withdrawPending?: (
    ctx: PermissionContext,
    pendingId: string,
  ) => Promise<void>;
  bulkUpdate?: (
    ctx: PermissionContext,
    ids: string[],
    patch: unknown,
    opts?: BulkUpdateOptions,
  ) => Promise<BulkUpdateResult>;
  bulkDelete?: (
    ctx: PermissionContext,
    ids: string[],
    opts?: BulkUpdateOptions,
  ) => Promise<BulkUpdateResult>;
  delete: (ctx: PermissionContext, id: string) => Promise<void>;
};

const assertPermissionContext = (ctx: PermissionContext): void => {
  if (ctx.manifest.surface !== ctx.surface) {
    throw new Error(
      `PermissionContext surface "${ctx.surface}" does not match manifest.surface "${ctx.manifest.surface}"`,
    );
  }
};

const assertSurface = <TRow, TRelated>(
  descriptor: SurfaceDescriptor<TRow, TRelated>,
  ctx: PermissionContext,
): void => {
  assertPermissionContext(ctx);
  if (ctx.surface !== descriptor.surfaceId) {
    throw new Error(
      `Expected PermissionContext.surface "${descriptor.surfaceId}", got "${ctx.surface}"`,
    );
  }
};

const rowVisible = async <TRow, TRelated>(
  store: StoreAdapter<TRow, TRelated>,
  ctx: PermissionContext,
  id: string,
): Promise<boolean> =>
  store.isRowVisibleToPrincipal(
    id,
    ctx.principal.id,
    ctx.manifest.rowScope,
    ctx.manifest.scopeIds,
  );

const projectEntity = async <TRow, TRelated>(
  descriptor: SurfaceDescriptor<TRow, TRelated>,
  store: StoreAdapter<TRow, TRelated>,
  row: TRow,
  manifest: PermissionContext["manifest"],
  listJoins?: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const related = await store.getRelated((row as { id: string }).id);
  return projectRow(descriptor, row, manifest, related, listJoins);
};

const normalizeListQuery = (
  raw: Record<string, unknown> | undefined,
  defaultPageSize: number,
): { status?: string; limit: number; offset: number } => ({
  status: raw?.status as string | undefined,
  limit: (raw?.limit as number | undefined) ?? defaultPageSize,
  offset: (raw?.offset as number | undefined) ?? 0,
});

export const createSurfaceDal = <TRow extends { id: string }, TRelated>(
  descriptor: SurfaceDescriptor<TRow, TRelated>,
  store: StoreAdapter<TRow, TRelated>,
  deps: SurfaceDalDeps = {},
): SurfaceDal => {
  const { pendingStore } = deps;
  const defaultPageSize = descriptor.listDefaultPageSize ?? 50;

  const get = async (
    ctx: PermissionContext,
    id: string,
  ): Promise<Record<string, unknown>> => {
    assertSurface(descriptor, ctx);

    const row = await store.get(id);
    if (!row || !(await rowVisible(store, ctx, id))) {
      throw new NotFoundError();
    }

    return projectEntity(descriptor, store, row, ctx.manifest);
  };

  const patch = async (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ): Promise<Record<string, unknown>> => {
    assertSurface(descriptor, ctx);

    const row = await store.get(id);
    if (!row || !(await rowVisible(store, ctx, id))) {
      throw new NotFoundError();
    }

    const schema = narrowPatchSchema(descriptor.patchSchema, ctx.manifest);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten());
    }

    const patchBody = parsed.data as Record<string, unknown>;
    const fieldIds = patchedFieldIds(patchBody);
    if (fieldIds.length === 0) {
      return projectEntity(descriptor, store, row, ctx.manifest);
    }

    const { directPatch, pendingPatch, pendingFieldIds } = splitVerificationPatch(
      ctx,
      patchBody,
      descriptor.verificationFieldIds,
    );

    if (pendingFieldIds.length > 0) {
      if (!pendingStore) {
        throw new ForbiddenError();
      }
      const open = await pendingStore.getPendingForEntity(id, {
        surfaceId: ctx.surface,
        status: "submitted",
      });
      if (open.length > 0) {
        throw new ConflictError("An open pending change already exists for this entity");
      }
      await pendingStore.submit({
        surfaceId: ctx.surface,
        entityId: id,
        fieldIds: [...pendingFieldIds],
        patch: pendingPatch,
        submittedBy: ctx.principal.id,
      });
    }

    const directFieldIds = patchedFieldIds(directPatch);

    if (directFieldIds.length === 0) {
      return projectEntity(descriptor, store, row, ctx.manifest);
    }

    assertVerificationDirectWrite(ctx, directPatch, descriptor.verificationFieldIds);

    const beforeSnapshot = descriptor.auditSnapshot(row);
    const updated = descriptor.applyPatch(row, directPatch);
    await store.upsert(updated);

    const relatedPatch = descriptor.applyRelatedPatch?.(id, directPatch);
    if (relatedPatch !== undefined) {
      await store.replaceRelated(id, relatedPatch);
    }

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
    });

    return projectEntity(descriptor, store, updated, ctx.manifest);
  };

  const loadSubmittedPending = async (
    ctx: PermissionContext,
    pendingId: string,
  ): Promise<PendingChange> => {
    assertSurface(descriptor, ctx);

    const pending = await pendingStore!.getById(pendingId);
    if (!pending || pending.status !== "submitted") {
      throw new NotFoundError();
    }

    if (pending.surfaceId !== ctx.surface) {
      throw new NotFoundError();
    }

    return pending;
  };

  const assertReviewerApprove = (
    ctx: PermissionContext,
    pending: PendingChange,
  ): void => {
    for (const fieldId of pending.fieldIds) {
      if (!fieldAllows(ctx.manifest, fieldId, "approve")) {
        throw new ForbiddenError();
      }
    }
  };

  const assertEntityVisibleForPending = async (
    store: StoreAdapter<TRow, TRelated>,
    ctx: PermissionContext,
    entityId: string,
  ): Promise<TRow> => {
    const row = await store.get(entityId);
    if (!row || !(await rowVisible(store, ctx, entityId))) {
      throw new NotFoundError();
    }
    return row;
  };

  const assertSubmitterMayWithdraw = (
    ctx: PermissionContext,
    pending: PendingChange,
  ): void => {
    if (pending.submittedBy === ctx.principal.id) {
      return;
    }
    for (const fieldId of pending.fieldIds) {
      if (!fieldAllows(ctx.manifest, fieldId, "submit")) {
        throw new ForbiddenError();
      }
    }
  };

  const acceptPending = pendingStore
    ? async (
        ctx: PermissionContext,
        pendingId: string,
      ): Promise<Record<string, unknown>> => {
        const pending = await loadSubmittedPending(ctx, pendingId);
        assertReviewerApprove(ctx, pending);

        const id = pending.entityId;
        const row = await assertEntityVisibleForPending(store, ctx, id);

        const patchBody = pending.patch as Record<string, unknown>;
        const fieldIds = patchedFieldIds(patchBody);
        if (fieldIds.length === 0) {
          throw new ValidationError("Pending change has no fields to apply");
        }

        assertVerificationDirectWrite(ctx, patchBody, descriptor.verificationFieldIds, {
          applier: true,
        });

        const beforeSnapshot = descriptor.auditSnapshot(row);

        await pendingStore.resolve(pendingId, {
          status: "accepted",
          decidedBy: ctx.principal.id,
        });

        const updated = descriptor.applyPatch(row, patchBody);
        await store.upsert(updated);

        const relatedPatch = descriptor.applyRelatedPatch?.(id, patchBody);
        if (relatedPatch !== undefined) {
          await store.replaceRelated(id, relatedPatch);
        }

        const afterSnapshot = descriptor.auditSnapshot(updated);

        await writeAudit({
          actorId: ctx.principal.id,
          action: "approve",
          tableName: descriptor.anchorTable,
          recordId: id,
          moduleId: ctx.surface,
          fieldIds,
          before: beforeSnapshot,
          after: afterSnapshot,
          patch: patchBody,
          approvalId: pendingId,
        });

        return projectEntity(descriptor, store, updated, ctx.manifest);
      }
    : undefined;

  const rejectPending = pendingStore
    ? async (
        ctx: PermissionContext,
        pendingId: string,
        opts?: { comment?: string },
      ): Promise<void> => {
        const pending = await loadSubmittedPending(ctx, pendingId);
        assertReviewerApprove(ctx, pending);

        const id = pending.entityId;
        await assertEntityVisibleForPending(store, ctx, id);

        const patchBody = pending.patch as Record<string, unknown>;
        const fieldIds = patchedFieldIds(patchBody);

        await pendingStore.resolve(pendingId, {
          status: "rejected",
          decidedBy: ctx.principal.id,
          ...(opts?.comment !== undefined ? { comment: opts.comment } : {}),
        });

        await writeAudit({
          actorId: ctx.principal.id,
          action: "reject",
          tableName: descriptor.anchorTable,
          recordId: id,
          moduleId: ctx.surface,
          fieldIds,
          patch: patchBody,
          approvalId: pendingId,
        });
      }
    : undefined;

  const withdrawPending = pendingStore
    ? async (ctx: PermissionContext, pendingId: string): Promise<void> => {
        const pending = await loadSubmittedPending(ctx, pendingId);
        assertSubmitterMayWithdraw(ctx, pending);
        await assertEntityVisibleForPending(store, ctx, pending.entityId);

        await pendingStore.resolve(pendingId, {
          status: "withdrawn",
          decidedBy: ctx.principal.id,
        });
      }
    : undefined;

  const deleteMethod = async (
    ctx: PermissionContext,
    id: string,
  ): Promise<void> => {
    assertSurface(descriptor, ctx);

    if (!canDeleteRow(descriptor, ctx)) {
      throw new ForbiddenError();
    }

    const row = await store.get(id);
    if (!row || !(await rowVisible(store, ctx, id))) {
      throw new NotFoundError();
    }

    await deleteRowWithAudit(descriptor, store, ctx, row);
  };

  const list =
    descriptor.capabilities.includes("list") &&
    descriptor.listQuerySchema !== undefined
      ? async (
          ctx: PermissionContext,
          rawOpts?: Record<string, unknown>,
        ): Promise<{ rows: Record<string, unknown>[]; total: number }> => {
          assertSurface(descriptor, ctx);

          const parsed = descriptor.listQuerySchema!.safeParse(rawOpts ?? {});
          if (!parsed.success) {
            throw new ValidationError(
              "Validation failed",
              parsed.error.flatten(),
            );
          }

          const query = normalizeListQuery(
            parsed.data as Record<string, unknown>,
            defaultPageSize,
          );
          const { rows, total } = await store.list({
            principalId: ctx.principal.id,
            rowScope: ctx.manifest.rowScope ?? "all",
            scopeIds: ctx.manifest.scopeIds,
            status: query.status,
            limit: query.limit,
            offset: query.offset,
          });

          return {
            rows: await Promise.all(
              rows.map((row) =>
                projectEntity(
                  descriptor,
                  store,
                  row,
                  ctx.manifest,
                  descriptor.listJoins?.(row),
                ),
              ),
            ),
            total,
          };
        }
      : undefined;

  const dal: SurfaceDal = {
    get,
    patch,
    delete: deleteMethod,
  };

  if (acceptPending) {
    dal.acceptPending = acceptPending;
  }

  if (rejectPending) {
    dal.rejectPending = rejectPending;
  }

  if (withdrawPending) {
    dal.withdrawPending = withdrawPending;
  }

  if (list) {
    dal.list = list;
  }

  if (descriptor.capabilities.includes("list")) {
    dal.bulkUpdate = (ctx, ids, patchBody, opts) =>
      bulkUpdate(descriptor, store, ctx, ids, patchBody, opts, pendingStore);
    dal.bulkDelete = (ctx, ids, opts) =>
      bulkDelete(descriptor, store, ctx, ids, opts);
  }

  return dal;
};
