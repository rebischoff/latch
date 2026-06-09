import type { PermissionContext } from "@latch/contracts";
import {
  ForbiddenError,
  NotFoundError,
  fieldAllows,
  surfaceAllows,
} from "@latch/contracts";
import { createSurfaceDal, type StoreAdapter } from "@latch/dal";

import type { UserRolesDetailPatchDto } from "../../modules/iam/generated/user_roles_detail.schema.generated.js";
import { bumpMemoryPolicyVersion } from "../iam/policy-version.js";
import { createUserRolesDetailDescriptor } from "./descriptors.js";
import type { MemoryUserStore, MemoryUserRecord } from "./memory-user-store.js";
import type { ProjectedUserRolesDetail } from "./project.js";
import type { RoleCatalogEntry } from "./validate-assignments.js";
import { validateRoleAssignmentsPatch } from "./validate-assignments.js";

export type UserRolesDetailDal = {
  getUserRoles: (ctx: PermissionContext, id: string) => ProjectedUserRolesDetail;
  patchUserRoles: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<ProjectedUserRolesDetail>;
};

const assertUserRolesDetailSurface = (ctx: PermissionContext): void => {
  if (ctx.surface !== "user_roles_detail") {
    throw new Error(
      `Expected PermissionContext.surface "user_roles_detail", got "${ctx.surface}"`,
    );
  }
};

const assertUserRolesDetailRead = (ctx: PermissionContext): void => {
  assertUserRolesDetailSurface(ctx);
  if (!surfaceAllows(ctx.manifest, "read")) {
    throw new NotFoundError();
  }
};

const assertUserRolesDetailWrite = (ctx: PermissionContext): void => {
  assertUserRolesDetailSurface(ctx);
  if (!surfaceAllows(ctx.manifest, "read")) {
    throw new NotFoundError();
  }
  if (!fieldAllows(ctx.manifest, "role_assignments", "write")) {
    throw new ForbiddenError();
  }
};

const assertNotSelfRolePatch = (
  ctx: PermissionContext,
  targetUserId: string,
): void => {
  if (ctx.principal.id === targetUserId) {
    throw new ForbiddenError();
  }
};

const createUserStoreAdapter = (
  store: MemoryUserStore,
): StoreAdapter<MemoryUserRecord, string[]> => ({
  get: (id) => store.getUser(id),
  list: () => ({ rows: [], total: 0 }),
  upsert: (row) => store.upsertUser(row),
  delete: (id) => {
    store.users.delete(id);
    store.rolesByUser.delete(id);
  },
  getRelated: (entityId) => store.listRolesForUser(entityId),
  replaceRelated: (entityId, roleIds) => store.setUserRoles(entityId, roleIds),
  isRowVisibleToPrincipal: (_entityId, _principalId, rowScope) =>
    rowScope === "all" || rowScope === undefined,
});

export type UserRolesDetailDalDeps = {
  catalog: Map<string, RoleCatalogEntry>;
};

export const createUserRolesDetailDal = (
  store: MemoryUserStore,
  deps: UserRolesDetailDalDeps,
): UserRolesDetailDal => {
  const adapter = createUserStoreAdapter(store);
  const detail = createSurfaceDal(createUserRolesDetailDescriptor(store), adapter);

  return {
    getUserRoles: (ctx, id) => {
      assertUserRolesDetailRead(ctx);
      return detail.get(ctx, id) as ProjectedUserRolesDetail;
    },
    patchUserRoles: async (ctx, id, body) => {
      assertUserRolesDetailWrite(ctx);
      assertNotSelfRolePatch(ctx, id);
      const patch = body as UserRolesDetailPatchDto;
      if (patch.role_assignments !== undefined) {
        validateRoleAssignmentsPatch({
          actor: ctx.principal,
          targetUserId: id,
          nextRoleIds: patch.role_assignments,
          catalog: deps.catalog,
          listUsersWithRole: (roleId) => store.listUsersWithRole(roleId),
        });
      }
      const dto = (await detail.patch(ctx, id, body)) as ProjectedUserRolesDetail;
      if (patch.role_assignments !== undefined) {
        bumpMemoryPolicyVersion();
      }
      return dto;
    },
  };
};
