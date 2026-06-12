import type { PendingStore } from "@latch/approval";
import { type BulkUpdateOptions, type BulkUpdateResult, type PermissionContext } from "@latch/contracts";
import type { StoreAdapter } from "./store-adapter.js";
import type { SurfaceDescriptor } from "./surface-descriptor.js";
export type SurfaceDalDeps = {
    pendingStore?: PendingStore;
};
export type SurfaceDal = {
    get: (ctx: PermissionContext, id: string) => Promise<Record<string, unknown>>;
    list?: (ctx: PermissionContext, opts?: Record<string, unknown>) => Promise<{
        rows: Record<string, unknown>[];
        total: number;
    }>;
    patch: (ctx: PermissionContext, id: string, body: unknown) => Promise<Record<string, unknown>>;
    acceptPending?: (ctx: PermissionContext, pendingId: string) => Promise<Record<string, unknown>>;
    rejectPending?: (ctx: PermissionContext, pendingId: string, opts?: {
        comment?: string;
    }) => Promise<void>;
    withdrawPending?: (ctx: PermissionContext, pendingId: string) => Promise<void>;
    bulkUpdate?: (ctx: PermissionContext, ids: string[], patch: unknown, opts?: BulkUpdateOptions) => Promise<BulkUpdateResult>;
    bulkDelete?: (ctx: PermissionContext, ids: string[], opts?: BulkUpdateOptions) => Promise<BulkUpdateResult>;
    delete: (ctx: PermissionContext, id: string) => Promise<void>;
};
export declare const createSurfaceDal: <TRow extends {
    id: string;
}, TRelated>(descriptor: SurfaceDescriptor<TRow, TRelated>, store: StoreAdapter<TRow, TRelated>, deps?: SurfaceDalDeps) => SurfaceDal;
//# sourceMappingURL=create-surface-dal.d.ts.map