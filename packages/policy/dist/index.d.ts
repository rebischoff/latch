export { PolicyService, synthesizeDataMasterBinding, synthesizeIamMasterBinding, unionGrantsStrategy, } from "./policy-service.js";
export type { MultiRoleCombine, PolicyServiceConfig, RoleMergeStrategy, } from "./policy-service.js";
export { CachingPolicyService, createCachingPolicyService, createMapManifestCacheStore, InMemoryManifestCacheStore, manifestCacheKey, parseManifestCacheKey, parseManifestCacheMode, POLICY_VERSION_KEY_SENTINEL, } from "./manifest-cache.js";
export type { ManifestCacheConfig, ManifestCacheKeyParts, ManifestCacheMode, ManifestCacheStore, ResolveManifestOptions, } from "./manifest-cache.js";
export { ensureFieldKeys, mergeRowScope, unionGrants, unionSurfaceActions, } from "./merge.js";
export type { MergeOptions } from "./merge.js";
export { createMemoryRoleGrantProvider, emptyRoleGrantProvider, MemoryRoleGrantProvider, } from "./grant-provider.js";
export type { MemoryRoleGrantBinding, RoleGrant, RoleGrantProvider, } from "./grant-provider.js";
export { definePolicyRegistry, defineSurfacePolicy, } from "./registry.js";
export { resolveGrantSurfaceDef, validateGrantAgainstCatalog, validateGrantTuple, } from "./validate-grant.js";
export type { GrantTuple } from "./validate-grant.js";
export type { ModePolicyOverlay, PolicyMode, PolicyRegistry, RoleModeOverlay, RolePolicyBinding, SurfaceKind, SurfacePolicyDefinition, } from "./registry.js";
//# sourceMappingURL=index.d.ts.map