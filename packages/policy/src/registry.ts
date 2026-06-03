import type {
  FieldAction,
  FieldId,
  RoleId,
  RoleSurfacePolicy,
  SurfaceId,
  SurfacePolicies,
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

/** Complete policy definition for one surface — injected into PolicyService. */
export interface SurfacePolicyDefinition {
  surface: SurfaceId;
  /** Ensures denied fields still appear in the manifest with `[]`. */
  fieldIds: readonly FieldId[];
  roles: Record<RoleId, RolePolicyBinding>;
  /** Optional restrict-only overlays keyed by PolicyScope.mode. */
  modes?: Partial<Record<PolicyMode, ModePolicyOverlay>>;
  /** Default `business` when omitted. */
  kind?: SurfaceKind;
}

/** Registry keyed by surface id — the consumer-supplied policy metadata. */
export type PolicyRegistry = Record<SurfaceId, SurfacePolicyDefinition>;

export interface SurfacePolicyMeta {
  fieldIds: readonly FieldId[];
  surfaceActionsByRole: Record<RoleId, FieldAction[]>;
  modes?: SurfacePolicyDefinition["modes"];
  kind?: SurfaceKind;
}

/** Assemble one registry entry from base SurfacePolicies + surface metadata. */
export const defineSurfacePolicy = (
  policies: SurfacePolicies,
  meta: SurfacePolicyMeta,
): SurfacePolicyDefinition => {
  const roles: Record<RoleId, RolePolicyBinding> = {};

  for (const [roleId, rolePolicy] of Object.entries(policies.roles)) {
    roles[roleId] = {
      ...rolePolicy,
      surfaceActions: meta.surfaceActionsByRole[roleId],
    };
  }

  return {
    surface: policies.surface,
    fieldIds: meta.fieldIds,
    roles,
    modes: meta.modes,
    kind: meta.kind,
  };
};

/** Build a PolicyRegistry from one or more surface definitions. */
export const definePolicyRegistry = (
  ...surfaces: SurfacePolicyDefinition[]
): PolicyRegistry => {
  const registry: PolicyRegistry = {};

  for (const surface of surfaces) {
    registry[surface.surface] = surface;
  }

  return registry;
};
