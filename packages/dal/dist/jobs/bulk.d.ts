import { type BulkUpdateOptions, type BulkUpdateResult, type PermissionContext } from "@latch/contracts";
import type { MemoryJobStore } from "./memory-store.js";
export declare const bulkUpdate: (store: MemoryJobStore, ctx: PermissionContext, ids: string[], patchBody: unknown, opts?: BulkUpdateOptions) => Promise<BulkUpdateResult>;
export declare const bulkDelete: (store: MemoryJobStore, ctx: PermissionContext, ids: string[], opts?: BulkUpdateOptions) => Promise<BulkUpdateResult>;
//# sourceMappingURL=bulk.d.ts.map