export { foldRoleGrantRows, type RoleGrantRow } from "./fold-role-grants.js";
export {
  preloadRoleGrantBindings,
  preloadRoleGrantProvider,
} from "./preload-role-grants.js";
export {
  createPolicyServiceForPrincipal,
  loadPrincipalFromDb,
} from "./request-policy.js";
export { spikePolicyRegistry } from "./policy-registry.js";
export {
  createRoleDetailDal,
  createRoleDetailDalForPool,
  type RoleDetailDal,
} from "./iam/repository.js";
export { listRolesFromPg, type RoleListItem } from "./iam/list-roles.js";
export { buildRoleDetailContext } from "./iam/role-detail-context.js";
export {
  fixtureGrantMatrixSurfaces,
  type GrantMatrixSurface,
} from "./grant-matrix-vocabulary.js";
export {
  MemoryRoleStore,
  seedSystemRoles,
  type RoleRecord,
} from "./iam/memory-role-store.js";
export {
  bumpPolicyVersion,
  bumpMemoryPolicyVersion,
  getMemoryPolicyVersion,
  getPolicyVersion,
  resetMemoryPolicyVersion,
} from "./iam/policy-version.js";
export { getActAsPrincipalId, setActAsPrincipalId, DEFAULT_ACT_AS_ID } from "./act-as.js";
export { getPool } from "./db.js";
export { getRequestPrincipal } from "./request-principal.js";
export { listUsersForActAs, type ActAsUserOption } from "./iam-user/list-users.js";
export {
  createUserRolesDetailDal,
  createUserRolesDetailDalForPool,
  type UserRolesDetailDal,
} from "./iam-user/repository.js";
export { buildUserRolesDetailContext } from "./iam-user/user-detail-context.js";
export { resolveAllManifests } from "./iam-user/resolve-all-manifests.js";
export { listUsersFromPg, type UserListItem } from "./iam-user/list-users-pg.js";
export { loadRoleCatalogFromPg } from "./iam-user/role-catalog.js";
export {
  MemoryUserStore,
  type MemoryUserRecord,
} from "./iam-user/memory-user-store.js";
export { seedPilotUsers, roleCatalogForHarness } from "./iam-user/seed.js";
