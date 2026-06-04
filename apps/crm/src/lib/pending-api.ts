import type { PendingChange, PendingStatus } from "@latch/approval";
import {
  fieldAllows,
  NotFoundError,
  ValidationError,
  type PermissionContext,
} from "@latch/contracts";

import {
  getJobsDal,
  getPendingById,
  getPendingForEntity,
  resolveContext,
  resolveContextFresh,
} from "./latch.js";

const JOB_DETAIL_SURFACE = "job_detail" as const;

const pendingVisibleToPrincipal = (
  ctx: PermissionContext,
  pending: PendingChange,
): boolean => {
  if (pending.submittedBy === ctx.principal.id) {
    return true;
  }
  return pending.fieldIds.some((fieldId) =>
    fieldAllows(ctx.manifest, fieldId, "approve"),
  );
};

export const assertJobDetailSurfaceQuery = (surface: string | null): void => {
  if (surface !== JOB_DETAIL_SURFACE) {
    throw new ValidationError(
      "Query parameter surface must be job_detail",
    );
  }
};

export const parsePendingStatusFilter = (
  raw: string | null,
): PendingStatus | undefined => {
  if (raw === null || raw === "") {
    return undefined;
  }
  const allowed: PendingStatus[] = [
    "submitted",
    "accepted",
    "rejected",
    "withdrawn",
  ];
  if (!allowed.includes(raw as PendingStatus)) {
    throw new ValidationError("Invalid status filter");
  }
  return raw as PendingStatus;
};

export const resolveJobDetailEntityContext = async (
  entityId: string,
  options?: { bypassCache?: boolean },
): Promise<PermissionContext> => {
  const resolve =
    options?.bypassCache === true ? resolveContextFresh : resolveContext;
  const ctx = await resolve({
    surfaceId: JOB_DETAIL_SURFACE,
    entityId,
  });
  getJobsDal().get(ctx, entityId);
  return ctx;
};

export const resolveJobDetailPendingById = async (
  pendingId: string,
): Promise<{ ctx: PermissionContext; pending: PendingChange }> => {
  const pending = await getPendingById(pendingId);
  if (!pending || pending.surfaceId !== JOB_DETAIL_SURFACE) {
    throw new NotFoundError();
  }

  const ctx = await resolveJobDetailEntityContext(pending.entityId, {
    bypassCache: true,
  });

  if (!pendingVisibleToPrincipal(ctx, pending)) {
    throw new NotFoundError();
  }

  return { ctx, pending };
};

export const listJobDetailPendingForEntity = async (
  entityId: string,
  status?: PendingStatus,
): Promise<{ ctx: PermissionContext; items: PendingChange[] }> => {
  const ctx = await resolveJobDetailEntityContext(entityId);
  const rows = await getPendingForEntity(entityId, {
    surfaceId: JOB_DETAIL_SURFACE,
    status,
  });
  const items = rows.filter((row) => pendingVisibleToPrincipal(ctx, row));
  return { ctx, items };
};
