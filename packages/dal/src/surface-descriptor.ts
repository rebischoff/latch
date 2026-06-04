import type { z } from "zod";

import type {
  FieldId,
  Manifest,
  PermissionContext,
  SurfaceId,
} from "@latch/contracts";

export type SurfaceCapability = "detail" | "list";

/**
 * Consumer-supplied surface metadata for the DAL kernel.
 * Field ids, column mapping, projection, patch application, and hooks live here.
 */
export type SurfaceDescriptor<TRow, TRelated = unknown> = {
  surfaceId: SurfaceId;
  /** Anchor table name for audit rows (e.g. `jobs`). */
  anchorTable: string;
  capabilities: readonly SurfaceCapability[];
  patchSchema: z.ZodObject<z.ZodRawShape>;
  listQuerySchema?: z.ZodObject<z.ZodRawShape>;
  listDefaultPageSize?: number;
  bulkMaxBatch?: number;
  /** Field id recorded on delete audit rows (defaults to first patched field). */
  deleteAuditFieldId?: FieldId;

  projectRow: (
    row: TRow,
    manifest: Manifest,
    related: TRelated,
    listJoins?: Record<string, unknown>,
  ) => Record<string, unknown>;

  applyPatch: (row: TRow, patch: Record<string, unknown>) => TRow;
  applyRelatedPatch?: (
    entityId: string,
    patch: Record<string, unknown>,
  ) => TRelated | undefined;
  auditSnapshot: (row: TRow) => Record<string, unknown>;
  /**
   * Full delete `before` payload (anchor + CASCADE children) when `restore` is granted.
   * Patch/approve audits use row-only `auditSnapshot`.
   */
  deleteAuditSnapshot?: (
    row: TRow,
    related: TRelated,
  ) => Record<string, unknown>;

  canDelete?: (ctx: PermissionContext) => boolean;
  /**
   * Fields marked `requires_verification` in Surface YAML (codegen tuple).
   * DAL routes `submit` ∧ ¬`write` patches to the pending store.
   */
  verificationFieldIds?: readonly FieldId[];

  /** Optional per-row join data for list surfaces (e.g. `customer_site`). */
  listJoins?: (row: TRow) => Record<string, unknown>;
};
