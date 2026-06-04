import type { PendingStore } from "@latch/approval";
import type {
  BulkUpdateOptions,
  BulkUpdateResult,
  PermissionContext,
} from "@latch/contracts";
import { createSurfaceDal } from "@latch/dal";

import { createJobStoreAdapter } from "../../../db/store.js";
import type { MemoryJobStore } from "../../../db/memory-store.js";
import {
  createJobDetailDescriptor,
  createJobListDescriptor,
} from "./descriptors.js";
import type { ProjectedJobDetail } from "./project.js";
import type { ProjectedJobListRow } from "./list-project.js";
import type { JobListQueryDto } from "./schemas.js";

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
  rejectPending: (
    ctx: PermissionContext,
    pendingId: string,
    opts?: { comment?: string },
  ) => Promise<void>;
  withdrawPending: (
    ctx: PermissionContext,
    pendingId: string,
  ) => Promise<void>;
  delete: (ctx: PermissionContext, id: string) => Promise<void>;
};

export const createJobsDal = (
  store: MemoryJobStore,
  pendingStore: PendingStore,
): JobsDal => {
  const adapter = createJobStoreAdapter(store);
  const detail = createSurfaceDal(createJobDetailDescriptor(store), adapter, {
    pendingStore,
  });
  const list = createSurfaceDal(createJobListDescriptor(store), adapter, {
    pendingStore,
  });

  return {
    get: (ctx, id) => detail.get(ctx, id) as ProjectedJobDetail,
    patch: async (ctx, id, body) =>
      (await detail.patch(ctx, id, body)) as ProjectedJobDetail,
    acceptPending: async (ctx, pendingId) =>
      (await detail.acceptPending!(ctx, pendingId)) as ProjectedJobDetail,
    rejectPending: async (ctx, pendingId, opts) =>
      detail.rejectPending!(ctx, pendingId, opts),
    withdrawPending: async (ctx, pendingId) =>
      detail.withdrawPending!(ctx, pendingId),
    delete: detail.delete,
    list: (ctx, opts) => {
      const result = list.list!(ctx, opts);
      return {
        rows: result.rows as ProjectedJobListRow[],
        total: result.total,
      };
    },
    bulkUpdate: (ctx, ids, patch, opts) => list.bulkUpdate!(ctx, ids, patch, opts),
    bulkDelete: (ctx, ids, opts) => list.bulkDelete!(ctx, ids, opts),
  };
};
