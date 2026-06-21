export { createSurfaceDal } from "./create-surface-dal";
export type { SurfaceDal, SurfaceDalDeps } from "./create-surface-dal";

export type { SurfaceDescriptor, SurfaceCapability } from "./surface-descriptor";

export type { StoreAdapter, ListQuery, ListResult } from "./store-adapter";

export { projectRow } from "./project";
export { patchedFieldIds } from "./patch-utils";
export { bulkUpdate, bulkDelete } from "./bulk";
export { canDeleteRow, deleteRowWithAudit } from "./delete-row";

export type { PendingStore } from "@latch/approval";
export { createMemoryPendingStore } from "@latch/approval";

export type { BulkUpdateResult } from "@latch/contracts";

export {
  bindPermissionSession,
  LATCH_DEFAULT_COMPANY_ID,
  withPermissionDb,
} from "@latch/pg-session";
