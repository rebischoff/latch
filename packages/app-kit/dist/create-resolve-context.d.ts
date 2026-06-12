import type { PermissionContext, PolicyScope, Principal, SurfaceId } from "@latch/contracts";
import { type ManifestCacheMode, type ManifestCacheStore, type PolicyService } from "@latch/policy";
export type ResolveContextOptions = {
    /**
     * Mutations must bypass the read cache (`stalePolicyOnWrite: recheck`).
     * Prefer {@link ResolveContextApi.resolveContextFresh} at mutation call sites.
     */
    bypassCache?: boolean;
};
export type CreateResolveContextOptions<TInput extends {
    surfaceId: string;
}> = {
    getPrincipal: () => Promise<Principal>;
    policyService: PolicyService;
    scopeFromInput: (input: TInput) => PolicyScope;
    surfaceFromInput: (input: TInput) => SurfaceId;
    getManifestCacheMode?: () => ManifestCacheMode;
    getRequestManifestCacheStore?: () => ManifestCacheStore;
};
export type ResolveContextApi<TInput extends {
    surfaceId: string;
}> = {
    resolveContext: (input: TInput, options?: ResolveContextOptions) => Promise<PermissionContext>;
    resolveContextFresh: (input: TInput) => Promise<PermissionContext>;
};
/** Wires `getPrincipal` → cached manifest → `PermissionContext`. */
export declare const createResolveContext: <TInput extends {
    surfaceId: string;
}>(options: CreateResolveContextOptions<TInput>) => ResolveContextApi<TInput>;
//# sourceMappingURL=create-resolve-context.d.ts.map