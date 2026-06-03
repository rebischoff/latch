import type { PermissionContext } from "@latch/contracts";
import {
  ForbiddenError,
  NotFoundError,
  fieldAllows,
  surfaceAllows,
} from "@latch/contracts";
import { createSurfaceDal } from "@latch/dal";

import { createIamUserStoreAdapter } from "../../../db/store.js";
import type { MemoryJobStore } from "../../../db/memory-store.js";
import { createUserRolesDetailDescriptor } from "./descriptors.js";
import type { ProjectedUserRolesDetail } from "./project.js";

export type IamDal = {
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

const assertNotSelfRolePatch = (ctx: PermissionContext, targetUserId: string): void => {
  if (ctx.principal.id === targetUserId) {
    throw new ForbiddenError();
  }
};

export const createIamDal = (store: MemoryJobStore): IamDal => {
  const adapter = createIamUserStoreAdapter(store);
  const detail = createSurfaceDal(
    createUserRolesDetailDescriptor(store),
    adapter,
  );

  return {
    getUserRoles: (ctx, id) => {
      assertUserRolesDetailRead(ctx);
      return detail.get(ctx, id) as ProjectedUserRolesDetail;
    },
    patchUserRoles: async (ctx, id, body) => {
      assertUserRolesDetailWrite(ctx);
      assertNotSelfRolePatch(ctx, id);
      return (await detail.patch(ctx, id, body)) as ProjectedUserRolesDetail;
    },
  };
};
