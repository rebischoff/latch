import { type PermissionContext } from "@latch/contracts";
import type { StoreAdapter } from "./store-adapter.js";
import type { SurfaceDescriptor } from "./surface-descriptor.js";
export declare const canDeleteRow: <TRow, TRelated>(descriptor: SurfaceDescriptor<TRow, TRelated>, ctx: PermissionContext) => boolean;
export declare const deleteRowWithAudit: <TRow, TRelated>(descriptor: SurfaceDescriptor<TRow, TRelated>, store: StoreAdapter<TRow, TRelated>, ctx: PermissionContext, row: TRow & {
    id: string;
}, opts?: {
    requestId?: string;
}) => Promise<void>;
//# sourceMappingURL=delete-row.d.ts.map