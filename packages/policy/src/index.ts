export {
  PolicyService,
  synthesizeDataMasterBinding,
  synthesizeIamMasterBinding,
  unionGrantsStrategy,
} from "./policy-service";
export type {
  MultiRoleCombine,
  PolicyServiceConfig,
  RoleMergeStrategy,
} from "./policy-service";

export {
  CachingPolicyService,
  createCachingPolicyService,
  createMapManifestCacheStore,
  InMemoryManifestCacheStore,
  manifestCacheKey,
  parseManifestCacheKey,
  parseManifestCacheMode,
  POLICY_VERSION_KEY_SENTINEL,
} from "./manifest-cache";
export type {
  ManifestCacheConfig,
  ManifestCacheKeyParts,
  ManifestCacheMode,
  ManifestCacheStore,
  ResolveManifestOptions,
} from "./manifest-cache";

export {
  ensureFieldKeys,
  mergeRowScope,
  unionGrants,
  unionSurfaceActions,
} from "./merge";
export type { MergeOptions } from "./merge";

export {
  createMemoryRoleGrantProvider,
  emptyRoleGrantProvider,
  MemoryRoleGrantProvider,
} from "./grant-provider";
export type {
  MemoryRoleGrantBinding,
  RoleGrant,
  RoleGrantProvider,
} from "./grant-provider";

export {
  definePolicyRegistry,
  defineSurfacePolicy,
} from "./registry";

export {
  resolveGrantSurfaceDef,
  validateGrantAgainstCatalog,
  validateGrantTuple,
} from "./validate-grant";
export type { GrantTuple } from "./validate-grant";
export type {
  ModePolicyOverlay,
  PolicyMode,
  PolicyRegistry,
  RoleModeOverlay,
  RolePolicyBinding,
  SurfaceKind,
  SurfacePolicyDefinition,
} from "./registry";
