/**
 * Client-safe permission types shared across server and UI.
 * @see docs/reference/permissions-and-ui-sync.md
 */

/** Actions grantable on a Surface or Field. */
export type FieldAction =
  | "read"
  | "write"
  | "submit"
  | "delete"
  | "restore"
  | "approve"
  | "hard_delete";

export type SurfaceId = string;
export type FieldId = string;
export type RoleId = string;

/** Who is acting on a request. */
export interface Principal {
  id: string;
  roles: RoleId[];
}

/** Row filter applied by the DAL after policy resolution. */
export type RowScope = "own" | "all";

/**
 * Server-resolved effective access for one Surface (and optional entity).
 * Field keys match Zod object keys from codegen for that Surface.
 */
export interface Manifest {
  surface: SurfaceId;
  /** Present in detail/edit scope when anchored to one record. */
  entityId?: string;
  /** Surface-level actions (e.g. open detail, delete surface). */
  actions: FieldAction[];
  fields: Record<FieldId, FieldAction[]>;
  /** Row filter for list/detail queries; set by PolicyService. */
  rowScope?: RowScope;
}

/** Input to PolicyService.resolve — which Surface (and record) to evaluate. */
export interface PolicyScope {
  surface: SurfaceId;
  entityId?: string;
  mode?: "list" | "detail" | "create";
}

/**
 * Request-scoped context required for every DAL call.
 * `surface` must match `manifest.surface`.
 */
export interface PermissionContext {
  principal: Principal;
  manifest: Manifest;
  surface: SurfaceId;
}

export type PolicyEffect = "allow" | "deny";

/** One role's grants for a single Field on a Surface (policy metadata shape). */
export interface FieldPolicyGrant {
  field: FieldId;
  actions: FieldAction[];
  effect?: PolicyEffect;
}

/** One role's policy for a Surface (used by @latch/policy; mirrors policies YAML). */
export interface RoleSurfacePolicy {
  rowScope?: RowScope;
  fields: FieldPolicyGrant[];
}

/** Static policy bindings for one Surface (repo YAML / policy registry). */
export interface SurfacePolicies {
  surface: SurfaceId;
  roles: Record<RoleId, RoleSurfacePolicy>;
}

/** Why a row was excluded from a bulk DAL operation. */
export type BulkSkipReason =
  | "forbidden_row"
  | "forbidden_field"
  | "not_found"
  | "validation_error";

export type BulkUpdateSkipped = {
  id: string;
  reason: BulkSkipReason;
  detail?: unknown;
};

export type BulkUpdateFailed = {
  id: string;
  reason: "db_error";
  detail?: unknown;
};

/** Per-row outcome of `bulkUpdate` / `bulkDelete` (see bulk-operations.md). */
export interface BulkUpdateResult {
  succeeded: string[];
  skipped: BulkUpdateSkipped[];
  failed: BulkUpdateFailed[];
}

export type BulkOperationMode = "partial" | "all_or_nothing";

export interface BulkUpdateOptions {
  mode?: BulkOperationMode;
  /** Links per-row audit rows and optional `bulk_summary` entry. */
  requestId?: string;
}
