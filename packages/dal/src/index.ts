export { createSurfaceDal } from "./create-surface-dal.js";
export type { SurfaceDal, SurfaceDalDeps } from "./create-surface-dal.js";

export type { SurfaceDescriptor, PendingWriteHook, SurfaceCapability } from "./surface-descriptor.js";

export type { StoreAdapter, ListQuery, ListResult } from "./store-adapter.js";

export { projectRow } from "./project.js";
export { patchedFieldIds } from "./patch-utils.js";
export { bulkUpdate, bulkDelete } from "./bulk.js";
export { canDeleteRow, deleteRowWithAudit } from "./delete-row.js";

export type { PendingStore } from "@latch/approval";
export { createMemoryPendingStore } from "@latch/approval";

export type { BulkUpdateResult } from "@latch/contracts";
