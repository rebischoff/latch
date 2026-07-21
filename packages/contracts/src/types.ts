/**
 * Client-safe permission types shared across server and UI.
 * @see docs/reference/permissions-and-ui-sync.md
 */

/** Actions grantable on a Surface or Field. */
export type FieldAction =
  | "read"
  | "create"
  | "write"
  | "submit"
  | "delete"
  | "restore"
  | "approve"
  | "hard_delete"
  | "win"
  | "lose"
  | "complete"
  | "send"
  | "cancel"
  | "add_role"
  | "remove_role"
  | "add_as_db_user";

export type SurfaceId = string;
export type FieldId = string;
export type RoleId = string;
/** `latch_scopes.id` — bounded branch/site/crew boundary (app instantiates). */
export type ScopeId = string;

/** One role assignment: catalog role + optional scope (`null` = company-wide). */
export interface RoleBinding {
  roleId: RoleId;
  scopeId: ScopeId | null;
}

/**
 * Catalog `latch_roles.role_class`. System classes drive `PolicyService`
 * synthesis (business / IAM wildcards); `app` roles resolve grants via the
 * `RoleGrantProvider`. The class — not a fixed UUID — identifies system rows,
 * so role ids stay DB-generated (`gen_random_uuid()`).
 */
export type RoleClass = "system_data" | "system_iam" | "app";

/** Who is acting on a request. */
export interface Principal {
  id: string;
  /** Scoped role assignments from `latch_user_roles` (role + optional scope). */
  bindings: RoleBinding[];
  /**
   * `role_class` for held roles, keyed by role id. Populated where the
   * principal is built from the DB (`loadPrincipalFromDb` joins `latch_roles`).
   * `PolicyService` synthesizes system grants from this, never from a hard-coded
   * role id. Absent → no system synthesis (e.g. app-role-only stub principals).
   */
  roleClasses?: Partial<Record<RoleId, RoleClass>>;
  /**
   * Global policy generation from `latch_policy_version` (Postgres).
   * Omitted for stub principals (`LATCH_STUB_*`) and when `DATABASE_URL` is unset.
   */
  policyVersion?: number;
}

/** Row filter applied by the DAL after policy resolution (`own ⊂ scope ⊂ all`). */
export type RowScope = "own" | "scope" | "all";

/**
 * Server-resolved effective access for one Surface (and optional entity).
 * Field keys match Zod object keys from codegen for that Surface.
 */
export interface Manifest {
  surface: SurfaceId;
  /** Echo of `Principal.policyVersion` at resolve time (future UI strict mode). */
  policyVersion?: number;
  /** Present in detail/edit scope when anchored to one record. */
  entityId?: string;
  /** Surface-level actions (e.g. open detail, delete surface). */
  actions: FieldAction[];
  fields: Record<FieldId, FieldAction[]>;
  /** Row filter for list/detail queries; set by PolicyService. */
  rowScope?: RowScope;
  /** Union of actor scopes for a `scope`-rung role (Phase B resolve). */
  scopeIds?: ScopeId[];
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
