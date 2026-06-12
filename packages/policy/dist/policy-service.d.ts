import type { FieldAction, Manifest, PolicyScope, Principal, RoleSurfacePolicy, RowScope } from "@latch/contracts";
import { type RoleGrantProvider } from "./grant-provider.js";
import { type MergeOptions } from "./merge.js";
import type { PolicyRegistry, SurfacePolicyDefinition } from "./registry.js";
/** Synthesized grants when principal holds `system_data` on a business surface. */
export declare const synthesizeDataMasterBinding: (surfaceDef: SurfacePolicyDefinition) => RoleSurfacePolicy & {
    surfaceActions: FieldAction[];
};
/** Synthesized grants when principal holds `system_iam` on an IAM surface. */
export declare const synthesizeIamMasterBinding: (surfaceDef: SurfacePolicyDefinition) => RoleSurfacePolicy & {
    surfaceActions: FieldAction[];
};
export type MultiRoleCombine = "union_grants";
export interface PolicyServiceConfig {
    multiRoleCombine?: MultiRoleCombine;
    denyWins?: boolean;
    registry?: PolicyRegistry;
    grantProvider?: RoleGrantProvider;
}
export interface RoleMergeStrategy {
    mergeRolePolicies(policies: RoleSurfacePolicy[], options: MergeOptions): {
        fields: Record<string, FieldAction[]>;
        rowScope?: RowScope;
    };
}
/** v1: union allows across roles; explicit deny strips when denyWins. */
export declare const unionGrantsStrategy: RoleMergeStrategy;
export declare class PolicyService {
    private readonly denyWins;
    private readonly mergeStrategy;
    private readonly registry;
    private readonly grantProvider;
    constructor(config?: PolicyServiceConfig);
    resolve: (principal: Principal, scope: PolicyScope) => Manifest;
}
//# sourceMappingURL=policy-service.d.ts.map