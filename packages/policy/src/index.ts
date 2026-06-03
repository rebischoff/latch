export {
  DATA_MASTER_ROLE_ID,
  PolicyService,
  synthesizeDataMasterBinding,
  unionGrantsStrategy,
} from "./policy-service.js";
export type {
  MultiRoleCombine,
  PolicyServiceConfig,
  RoleMergeStrategy,
} from "./policy-service.js";

export {
  ensureFieldKeys,
  mergeRowScope,
  unionGrants,
  unionSurfaceActions,
} from "./merge.js";
export type { MergeOptions } from "./merge.js";

export {
  definePolicyRegistry,
  defineSurfacePolicy,
} from "./registry.js";
export type {
  ModePolicyOverlay,
  PolicyMode,
  PolicyRegistry,
  RoleModeOverlay,
  RolePolicyBinding,
  SurfaceKind,
  SurfacePolicyDefinition,
  SurfacePolicyMeta,
} from "./registry.js";
