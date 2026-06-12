import type { PendingStore } from "@latch/approval";
import { type BulkUpdateOptions, type BulkUpdateResult, type PermissionContext } from "@latch/contracts";
import type { StoreAdapter } from "./store-adapter.js";
import type { SurfaceDescriptor } from "./surface-descriptor.js";
export declare const bulkUpdate: <TRow, TRelated>(descriptor: SurfaceDescriptor<TRow, TRelated>, store: StoreAdapter<TRow, TRelated>, ctx: PermissionContext, ids: string[], patchBody: unknown, opts?: BulkUpdateOptions, pendingStore?: PendingStore) => Promise<BulkUpdateResult>;
export declare const bulkDelete: <TRow, TRelated>(descriptor: SurfaceDescriptor<TRow, TRelated>, store: StoreAdapter<TRow, TRelated>, ctx: PermissionContext, ids: string[], opts?: BulkUpdateOptions) => Promise<BulkUpdateResult>;
//# sourceMappingURL=bulk.d.ts.map