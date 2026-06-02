export { PolicyService, unionGrantsStrategy } from "./policy-service.js";
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
  jobDetailPolicies,
  JOB_DETAIL_FIELD_IDS,
  JOB_DETAIL_SURFACE_ACTIONS_BY_ROLE,
} from "./surfaces/job-detail.js";

export {
  jobListPolicies,
  JOB_LIST_FIELD_IDS,
  JOB_LIST_SURFACE_ACTIONS_BY_ROLE,
} from "./surfaces/job-list.js";
