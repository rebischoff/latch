import type { PendingStore } from "@latch/approval";
import { type BulkUpdateOptions, type BulkUpdateResult, type PermissionContext } from "@latch/contracts";
import type { MemoryJobStore } from "./memory-store.js";
import { type ProjectedJobListRow } from "./list-project.js";
import { type ProjectedJobDetail } from "./project.js";
import { type JobListQueryDto } from "./schemas.js";
export type JobListResult = {
    rows: ProjectedJobListRow[];
    total: number;
};
export type JobsDal = {
    list: (ctx: PermissionContext, opts?: JobListQueryDto) => JobListResult;
    bulkUpdate: (ctx: PermissionContext, ids: string[], patch: unknown, opts?: BulkUpdateOptions) => Promise<BulkUpdateResult>;
    bulkDelete: (ctx: PermissionContext, ids: string[], opts?: BulkUpdateOptions) => Promise<BulkUpdateResult>;
    get: (ctx: PermissionContext, id: string) => ProjectedJobDetail;
    patch: (ctx: PermissionContext, id: string, body: unknown) => Promise<ProjectedJobDetail>;
    acceptPending: (ctx: PermissionContext, pendingId: string) => Promise<ProjectedJobDetail>;
    delete: (ctx: PermissionContext, id: string) => Promise<void>;
};
export declare const createJobsDal: (store: MemoryJobStore, pendingStore: PendingStore) => JobsDal;
//# sourceMappingURL=repository.d.ts.map