import { type PermissionContext } from "@latch/contracts";
import type { MemoryJobRecord, MemoryJobStore } from "./memory-store.js";
export declare const canDeleteJob: (ctx: PermissionContext) => boolean;
export declare const deleteJobWithAudit: (store: MemoryJobStore, ctx: PermissionContext, row: MemoryJobRecord, opts?: {
    requestId?: string;
}) => Promise<void>;
//# sourceMappingURL=job-delete.d.ts.map