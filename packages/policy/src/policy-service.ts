import type {
  FieldAction,
  Manifest,
  PolicyScope,
  Principal,
  RoleSurfacePolicy,
  SurfaceId,
  SurfacePolicies,
} from "@latch/contracts";

import {
  ensureFieldKeys,
  mergeRowScope,
  unionGrants,
  unionSurfaceActions,
  type MergeOptions,
} from "./merge.js";
import {
  JOB_DETAIL_FIELD_IDS,
  JOB_DETAIL_SURFACE_ACTIONS_BY_ROLE,
  jobDetailPolicies,
} from "./surfaces/job-detail.js";

export type MultiRoleCombine = "union_grants";

export interface PolicyServiceConfig {
  multiRoleCombine?: MultiRoleCombine;
  denyWins?: boolean;
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

const surfaceRegistry: Record<SurfaceId, SurfacePolicies> = {
  job_detail: jobDetailPolicies,
};

const knownFieldsBySurface: Record<SurfaceId, readonly string[]> = {
  job_detail: JOB_DETAIL_FIELD_IDS,
};

const surfaceActionsBySurface: Record<
  SurfaceId,
  Record<string, FieldAction[]>
> = {
  job_detail: JOB_DETAIL_SURFACE_ACTIONS_BY_ROLE,
};

export class PolicyService {
  private readonly denyWins: boolean;
  private readonly mergeStrategy: RoleMergeStrategy;

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
  }

  resolve = (principal: Principal, scope: PolicyScope): Manifest => {
    const policies = surfaceRegistry[scope.surface];
    if (!policies) {
      throw new Error(`Unknown surface: ${scope.surface}`);
    }

    const rolePolicies: RoleSurfacePolicy[] = [];
    const surfaceActionLists: FieldAction[][] = [];

    for (const roleId of principal.roles) {
      const rolePolicy = policies.roles[roleId];
      if (!rolePolicy) {
        continue;
      }
      rolePolicies.push(rolePolicy);
      const roleSurfaceActions =
        surfaceActionsBySurface[scope.surface]?.[roleId];
      if (roleSurfaceActions) {
        surfaceActionLists.push(roleSurfaceActions);
      }
    }

    const mergeOptions: MergeOptions = { denyWins: this.denyWins };
    const merged = this.mergeStrategy.mergeRolePolicies(
      rolePolicies,
      mergeOptions,
    );

    const knownFields = knownFieldsBySurface[scope.surface] ?? [];
    const fields = ensureFieldKeys(merged.fields, [...knownFields]);

    return {
      surface: scope.surface,
      entityId: scope.entityId,
      actions: unionSurfaceActions(surfaceActionLists),
      fields,
      rowScope: merged.rowScope,
    };
  };
}
