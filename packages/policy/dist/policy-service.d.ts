import type { FieldAction, Manifest, PolicyScope, Principal, RoleSurfacePolicy } from "@latch/contracts";
import { type MergeOptions } from "./merge.js";
export type MultiRoleCombine = "union_grants";
export interface PolicyServiceConfig {
    multiRoleCombine?: MultiRoleCombine;
    denyWins?: boolean;
}
export interface RoleMergeStrategy {
    mergeRolePolicies(policies: RoleSurfacePolicy[], options: MergeOptions): {
        fields: Record<string, FieldAction[]>;
        rowScope?: "own" | "all";
    };
}
/** v1: union allows across roles; explicit deny strips when denyWins. */
export declare const unionGrantsStrategy: RoleMergeStrategy;
export declare class PolicyService {
    private readonly denyWins;
    private readonly mergeStrategy;
    constructor(config?: PolicyServiceConfig);
    resolve: (principal: Principal, scope: PolicyScope) => Manifest;
}
//# sourceMappingURL=policy-service.d.ts.map