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

import { bulkDelete, bulkUpdate } from "./bulk.js";
import { canDeleteRow, deleteRowWithAudit } from "./delete-row.js";
import { patchedFieldIds } from "./patch-utils.js";
import { projectRow } from "./project.js";
import type { StoreAdapter } from "./store-adapter.js";
import type { SurfaceDescriptor } from "./surface-descriptor.js";

export type SurfaceDalDeps = {
  pendingStore?: PendingStore;
};

export type SurfaceDal = {
  get: (ctx: PermissionContext, id: string) => Record<string, unknown>;
  list?: (
    ctx: PermissionContext,
    opts?: Record<string, unknown>,
  ) => { rows: Record<string, unknown>[]; total: number };
  patch: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
  acceptPending?: (
    ctx: PermissionContext,
    pendingId: string,
  ) => Promise<Record<string, unknown>>;
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

const rowVisible = <TRow, TRelated>(
  store: StoreAdapter<TRow, TRelated>,
  ctx: PermissionContext,
  id: string,
): boolean =>
  store.isRowVisibleToPrincipal(id, ctx.principal.id, ctx.manifest.rowScope);

const projectEntity = <TRow, TRelated>(
  descriptor: SurfaceDescriptor<TRow, TRelated>,
  store: StoreAdapter<TRow, TRelated>,
  row: TRow,
  manifest: PermissionContext["manifest"],
  listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const related = store.getRelated((row as { id: string }).id);
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

  const get = (ctx: PermissionContext, id: string): Record<string, unknown> => {
    assertSurface(descriptor, ctx);

    const row = store.get(id);
    if (!row || !rowVisible(store, ctx, id)) {
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

    const row = store.get(id);
    if (!row || !rowVisible(store, ctx, id)) {
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

    if (descriptor.pendingWrite?.test(ctx, patchBody) && pendingStore) {
      pendingStore.submit({
        surfaceId: ctx.surface,
        entityId: id,
        fieldIds: [...descriptor.pendingWrite.fieldIds],
        patch: descriptor.pendingWrite.extractPendingPatch(patchBody),
        submittedBy: ctx.principal.id,
      });
    }

    const directPatch = descriptor.pendingWrite?.test(ctx, patchBody)
      ? descriptor.pendingWrite.stripFromDirectPatch(patchBody)
      : patchBody;
    const directFieldIds = patchedFieldIds(directPatch);

    if (directFieldIds.length === 0) {
      return projectEntity(descriptor, store, row, ctx.manifest);
    }

    const beforeSnapshot = descriptor.auditSnapshot(row);
    const updated = descriptor.applyPatch(row, directPatch);
    store.upsert(updated);

    const relatedPatch = descriptor.applyRelatedPatch?.(id, directPatch);
    if (relatedPatch !== undefined) {
      store.replaceRelated(id, relatedPatch);
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

  const acceptPending = pendingStore
    ? async (
        ctx: PermissionContext,
        pendingId: string,
      ): Promise<Record<string, unknown>> => {
        assertSurface(descriptor, ctx);

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
        const row = store.get(id);
        if (!row || !rowVisible(store, ctx, id)) {
          throw new NotFoundError();
        }

        const patchBody = pending.patch as Record<string, unknown>;
        const fieldIds = patchedFieldIds(patchBody);
        if (fieldIds.length === 0) {
          throw new ValidationError("Pending change has no fields to apply");
        }

        const beforeSnapshot = descriptor.auditSnapshot(row);
        const updated = descriptor.applyPatch(row, patchBody);
        store.upsert(updated);

        const relatedPatch = descriptor.applyRelatedPatch?.(id, patchBody);
        if (relatedPatch !== undefined) {
          store.replaceRelated(id, relatedPatch);
        }

        pendingStore.resolve(pendingId, {
          status: "accepted",
          decidedBy: ctx.principal.id,
        });

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

  const deleteMethod = async (
    ctx: PermissionContext,
    id: string,
  ): Promise<void> => {
    assertSurface(descriptor, ctx);

    if (!canDeleteRow(descriptor, ctx)) {
      throw new ForbiddenError();
    }

    const row = store.get(id);
    if (!row || !rowVisible(store, ctx, id)) {
      throw new NotFoundError();
    }

    await deleteRowWithAudit(descriptor, store, ctx, row);
  };

  const list =
    descriptor.capabilities.includes("list") &&
    descriptor.listQuerySchema !== undefined
      ? (ctx: PermissionContext, rawOpts?: Record<string, unknown>) => {
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
          const { rows, total } = store.list({
            principalId: ctx.principal.id,
            rowScope: ctx.manifest.rowScope ?? "all",
            status: query.status,
            limit: query.limit,
            offset: query.offset,
          });

          return {
            rows: rows.map((row) =>
              projectEntity(
                descriptor,
                store,
                row,
                ctx.manifest,
                descriptor.listJoins?.(row),
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

  if (list) {
    dal.list = list;
  }

  if (descriptor.capabilities.includes("list")) {
    dal.bulkUpdate = (ctx, ids, patchBody, opts) =>
      bulkUpdate(descriptor, store, ctx, ids, patchBody, opts);
    dal.bulkDelete = (ctx, ids, opts) =>
      bulkDelete(descriptor, store, ctx, ids, opts);
  }

  return dal;
};
