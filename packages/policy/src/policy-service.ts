import type {
  FieldAction,
  Manifest,
  PolicyScope,
  Principal,
  RoleClass,
  RoleId,
  RoleSurfacePolicy,
  RowScope,
  ScopeId,
} from "@latch/contracts";
import { principalRoleIds } from "@latch/contracts";

import {
  emptyRoleGrantProvider,
  type RoleGrantProvider,
} from "./grant-provider";
import {
  ensureFieldKeys,
  mergeRowScope,
  unionGrants,
  unionSurfaceActions,
  type MergeOptions,
} from "./merge";
import type { PolicyRegistry, SurfacePolicyDefinition } from "./registry";

const BUILTIN_FIELD_ACTIONS: FieldAction[] = ["read", "write"];
const BUILTIN_SURFACE_ACTIONS: FieldAction[] = ["read", "write"];

const isBusinessSurface = (surfaceDef: SurfacePolicyDefinition): boolean =>
  (surfaceDef.kind ?? "business") === "business";

const isIamSurface = (surfaceDef: SurfacePolicyDefinition): boolean =>
  surfaceDef.kind === "iam";

/**
 * Does the principal hold any role of the given system class? System rows are
 * identified by `latch_roles.role_class` (DB-generated UUID), not by a fixed
 * role id — see `Principal.roleClasses` and P11.
 */
const holdsSystemClass = (
  principal: Principal,
  roleClass: RoleClass,
): boolean =>
  principal.bindings.some(
    (b) => principal.roleClasses?.[b.roleId] === roleClass,
  );

type RolePolicyContribution = {
  roleId: RoleId;
  policy: RoleSurfacePolicy;
};

const scopeContributingRoleIds = (
  contributions: RolePolicyContribution[],
): Set<RoleId> =>
  new Set(
    contributions
      .filter((c) => c.policy.rowScope === "scope")
      .map((c) => c.roleId),
  );

const resolveScopeIds = (
  principal: Principal,
  contributingRoleIds: Set<RoleId>,
): ScopeId[] =>
  [
    ...new Set(
      principal.bindings
        .filter(
          (b) => b.scopeId != null && contributingRoleIds.has(b.roleId),
        )
        .map((b) => b.scopeId as ScopeId),
    ),
  ].sort();

/** Synthesized grants when principal holds `system_data` on a business surface. */
export const synthesizeDataMasterBinding = (
  surfaceDef: SurfacePolicyDefinition,
): RoleSurfacePolicy & { surfaceActions: FieldAction[] } => ({
  rowScope: "all",
  fields: surfaceDef.fieldIds.map((field) => ({
    field,
    actions: BUILTIN_FIELD_ACTIONS,
  })),
  surfaceActions: BUILTIN_SURFACE_ACTIONS,
});

/** Synthesized grants when principal holds `system_iam` on an IAM surface. */
export const synthesizeIamMasterBinding = (
  surfaceDef: SurfacePolicyDefinition,
): RoleSurfacePolicy & { surfaceActions: FieldAction[] } => ({
  rowScope: "all",
  fields: surfaceDef.fieldIds.map((field) => ({
    field,
    actions: [...surfaceDef.fieldActions],
  })),
  surfaceActions: [...surfaceDef.surfaceActions],
});

export type MultiRoleCombine = "union_grants";

export interface PolicyServiceConfig {
  multiRoleCombine?: MultiRoleCombine;
  denyWins?: boolean;
  registry?: PolicyRegistry;
  grantProvider?: RoleGrantProvider;
}

export interface RoleMergeStrategy {
  mergeRolePolicies(
    policies: RoleSurfacePolicy[],
    options: MergeOptions,
  ): {
    fields: Record<string, FieldAction[]>;
    rowScope?: RowScope;
  };
}

/** v1: union allows across roles; explicit deny strips when denyWins. */
export const unionGrantsStrategy: RoleMergeStrategy = {
  mergeRolePolicies: (policies, options) => {
    const grants = policies.flatMap((p) => p.fields);
    return {
      fields: unionGrants(grants, options),
      rowScope: mergeRowScope(policies.map((p) => p.rowScope)),
    };
  },
};

export class PolicyService {
  private readonly denyWins: boolean;
  private readonly mergeStrategy: RoleMergeStrategy;
  private readonly registry: PolicyRegistry;
  private readonly grantProvider: RoleGrantProvider;

  constructor(config: PolicyServiceConfig = {}) {
    if (
      config.multiRoleCombine !== undefined &&
      config.multiRoleCombine !== "union_grants"
    ) {
      throw new Error(
        `Unsupported multiRoleCombine: ${config.multiRoleCombine}`,
      );
    }
    this.denyWins = config.denyWins ?? true;
    this.mergeStrategy = unionGrantsStrategy;
    this.registry = config.registry ?? {};
    this.grantProvider = config.grantProvider ?? emptyRoleGrantProvider;
  }

  resolve = (principal: Principal, scope: PolicyScope): Manifest => {
    const surfaceDef = this.registry[scope.surface];
    if (!surfaceDef) {
      throw new Error(`Unknown surface: ${scope.surface}`);
    }

    const rolePolicies: RoleSurfacePolicy[] = [];
    const roleContributions: RolePolicyContribution[] = [];
    const surfaceActionLists: FieldAction[][] = [];

    if (
      holdsSystemClass(principal, "system_data") &&
      isBusinessSurface(surfaceDef)
    ) {
      const dataMaster = synthesizeDataMasterBinding(surfaceDef);
      rolePolicies.push({
        rowScope: dataMaster.rowScope,
        fields: dataMaster.fields,
      });
      surfaceActionLists.push(dataMaster.surfaceActions);
    }

    if (
      holdsSystemClass(principal, "system_iam") &&
      isIamSurface(surfaceDef)
    ) {
      const iamMaster = synthesizeIamMasterBinding(surfaceDef);
      rolePolicies.push({
        rowScope: iamMaster.rowScope,
        fields: iamMaster.fields,
      });
      surfaceActionLists.push(iamMaster.surfaceActions);
    }

    for (const roleId of principalRoleIds(principal)) {
      for (const grant of this.grantProvider.grantsFor(
        [roleId],
        scope.surface,
      )) {
        const policy: RoleSurfacePolicy = {
          rowScope: grant.rowScope,
          fields: grant.fields,
        };
        rolePolicies.push(policy);
        roleContributions.push({ roleId, policy });
        if (grant.surfaceActions) {
          surfaceActionLists.push(grant.surfaceActions);
        }
      }
    }

    const mergeOptions: MergeOptions = { denyWins: this.denyWins };
    const merged = this.mergeStrategy.mergeRolePolicies(
      rolePolicies,
      mergeOptions,
    );

    const fields = ensureFieldKeys(merged.fields, [...surfaceDef.fieldIds]);

    let scopeIds: ScopeId[] | undefined;
    if (merged.rowScope === "scope") {
      scopeIds = resolveScopeIds(
        principal,
        scopeContributingRoleIds(roleContributions),
      );
    }

    return {
      surface: scope.surface,
      entityId: scope.entityId,
      actions: unionSurfaceActions(surfaceActionLists),
      fields,
      rowScope: merged.rowScope,
      ...(scopeIds !== undefined ? { scopeIds } : {}),
    };
  };
}
