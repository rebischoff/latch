import type {
  FieldAction,
  Manifest,
  PolicyScope,
  Principal,
  RoleSurfacePolicy,
} from "@latch/contracts";

import {
  ensureFieldKeys,
  mergeRowScope,
  unionGrants,
  unionSurfaceActions,
  type MergeOptions,
} from "./merge.js";
import type { PolicyRegistry, SurfacePolicyDefinition } from "./registry.js";

/** Built-in role id — wildcard grants on business surfaces only (no per-Surface YAML). */
export const DATA_MASTER_ROLE_ID = "data_master";

const DATA_MASTER_FIELD_ACTIONS: FieldAction[] = ["read", "write"];
const DATA_MASTER_SURFACE_ACTIONS: FieldAction[] = ["read", "write"];

const isBusinessSurface = (surfaceDef: SurfacePolicyDefinition): boolean =>
  (surfaceDef.kind ?? "business") === "business";

/** Synthesized grants when principal includes `data_master` on a business surface. */
export const synthesizeDataMasterBinding = (
  surfaceDef: SurfacePolicyDefinition,
): RoleSurfacePolicy & { surfaceActions: FieldAction[] } => ({
  rowScope: "all",
  fields: surfaceDef.fieldIds.map((field) => ({
    field,
    actions: DATA_MASTER_FIELD_ACTIONS,
  })),
  surfaceActions: DATA_MASTER_SURFACE_ACTIONS,
});

export type MultiRoleCombine = "union_grants";

export interface PolicyServiceConfig {
  multiRoleCombine?: MultiRoleCombine;
  denyWins?: boolean;
  registry?: PolicyRegistry;
}

export interface RoleMergeStrategy {
  mergeRolePolicies(
    policies: RoleSurfacePolicy[],
    options: MergeOptions,
  ): {
    fields: Record<string, FieldAction[]>;
    rowScope?: "own" | "all";
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
  }

  resolve = (principal: Principal, scope: PolicyScope): Manifest => {
    const surfaceDef = this.registry[scope.surface];
    if (!surfaceDef) {
      throw new Error(`Unknown surface: ${scope.surface}`);
    }

    const rolePolicies: RoleSurfacePolicy[] = [];
    const surfaceActionLists: FieldAction[][] = [];

    if (
      principal.roles.includes(DATA_MASTER_ROLE_ID) &&
      isBusinessSurface(surfaceDef)
    ) {
      const dataMaster = synthesizeDataMasterBinding(surfaceDef);
      rolePolicies.push({
        rowScope: dataMaster.rowScope,
        fields: dataMaster.fields,
      });
      surfaceActionLists.push(dataMaster.surfaceActions);
    }

    for (const roleId of principal.roles) {
      const roleBinding = surfaceDef.roles[roleId];
      if (!roleBinding) {
        continue;
      }
      rolePolicies.push({
        rowScope: roleBinding.rowScope,
        fields: roleBinding.fields,
      });
      if (roleBinding.surfaceActions) {
        surfaceActionLists.push(roleBinding.surfaceActions);
      }
    }

    const mergeOptions: MergeOptions = { denyWins: this.denyWins };
    const merged = this.mergeStrategy.mergeRolePolicies(
      rolePolicies,
      mergeOptions,
    );

    const fields = ensureFieldKeys(merged.fields, [...surfaceDef.fieldIds]);

    return {
      surface: scope.surface,
      entityId: scope.entityId,
      actions: unionSurfaceActions(surfaceActionLists),
      fields,
      rowScope: merged.rowScope,
    };
  };
}
