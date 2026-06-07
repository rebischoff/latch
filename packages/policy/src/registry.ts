import type {
  FieldAction,
  FieldId,
  RoleId,
  RoleSurfacePolicy,
  SurfaceId,
} from "@latch/contracts";

/** Restrict-only overlay for a role in a specific screen mode. */
export interface RoleModeOverlay {
  surfaceActions?: FieldAction[];
  fields?: RoleSurfacePolicy["fields"];
}

/** Mode-specific policy narrowing (must not widen base grants). */
export interface ModePolicyOverlay {
  roles?: Partial<Record<RoleId, RoleModeOverlay>>;
}

export type PolicyMode = "list" | "detail" | "create";

/** IAM surfaces are excluded from the `data_master` built-in wildcard. */
export type SurfaceKind = "iam" | "business";

/** One role's grants for a surface, including surface-level actions. */
export interface RolePolicyBinding extends RoleSurfacePolicy {
  surfaceActions?: FieldAction[];
}

/**
 * Codegen-emitted policy vocabulary for one surface (from `*.schema.generated.ts`).
 * Role grants are runtime data loaded via {@link RoleGrantProvider}.
 */
export interface SurfacePolicyDefinition {
  surface: SurfaceId;
  /** Ensures denied fields still appear in the manifest with `[]`. */
  fieldIds: readonly FieldId[];
  /** Closed Field-action vocabulary grantable on this surface. */
  fieldActions: readonly FieldAction[];
  /** Closed surface-level action vocabulary grantable on this surface. */
  surfaceActions: readonly FieldAction[];
  /** Screen modes this surface supports (for mode overlays at runtime). */
  modes?: readonly PolicyMode[];
  /** Default `business` when omitted. */
  kind?: SurfaceKind;
}

/** Registry keyed by surface id — codegen catalog consumed by PolicyService. */
export type PolicyRegistry = Record<SurfaceId, SurfacePolicyDefinition>;

/** Build a PolicyRegistry from one or more surface catalog entries. */
export const definePolicyRegistry = (
  ...surfaces: SurfacePolicyDefinition[]
): PolicyRegistry => {
  const registry: PolicyRegistry = {};

  for (const surface of surfaces) {
    registry[surface.surface] = surface;
  }

  return registry;
};

/** Assemble one catalog entry (identity helper for generated files). */
export const defineSurfacePolicy = (
  catalog: SurfacePolicyDefinition,
): SurfacePolicyDefinition => catalog;
