import {
  ForbiddenError,
  ValidationError,
  type PermissionContext,
} from "@latch/contracts";
import { createSurfaceDal, type StoreAdapter, type SurfaceDal } from "@latch/dal";
import {
  validateGrantTuple,
  type PolicyRegistry,
} from "@latch/policy";
import type { Pool } from "pg";

import { createRoleListStore } from "../../modules/iam/generated/role_list.store.generated.js";
import { createUserDetailStore } from "../../modules/iam/generated/user_detail.store.generated.js";
import { createUserListStore } from "../../modules/iam/generated/user_list.store.generated.js";
import { subhubRegistry } from "../policy-registry.js";

import {
  roleDetailDescriptor,
  roleListDescriptor,
  userDetailDescriptor,
  userListDescriptor,
  userRolesDetailDescriptor,
  type RoleDetailRelatedPatch,
  type RoleDetailRow,
  type RoleDetailStoreRelated,
  type UserRolesRow,
} from "./descriptors.js";
import { assertIamSurfaceRead } from "./gate.js";
import {
  allRoleIdsExist,
  assertNotLastSystemRoleHolder,
  deleteAppRole,
  isSystemRoleClass,
  loadRoleDetailRelated,
  loadRoleDetailRow,
  loadUserRoleIds,
  loadUserRolesRow,
  replaceRoleGrants,
  replaceRoleSurfaceBindings,
  replaceUserRoles,
  updateRoleDisplayName,
  type RoleGrantTuple,
} from "./repository.js";

export type IamDal = {
  userList: SurfaceDal;
  userDetail: SurfaceDal;
  userRolesDetail: SurfaceDal;
  roleList: SurfaceDal;
  roleDetail: SurfaceDal;
};

export type CreateIamDalOptions = {
  pool: Pool;
  getActorId: () => Promise<string>;
  registry?: PolicyRegistry;
};

const withIamGate = (dal: SurfaceDal): SurfaceDal => ({
  ...dal,
  get: async (ctx, id) => {
    assertIamSurfaceRead(ctx);
    return dal.get(ctx, id);
  },
  list: dal.list
    ? async (ctx, opts) => {
        assertIamSurfaceRead(ctx);
        return dal.list!(ctx, opts);
      }
    : undefined,
  patch: async (ctx, id, body) => {
    assertIamSurfaceRead(ctx);
    return dal.patch(ctx, id, body);
  },
  delete: async (ctx, id) => {
    assertIamSurfaceRead(ctx);
    return dal.delete(ctx, id);
  },
});

const assertNotSelfRolePatch = (
  ctx: PermissionContext,
  userId: string,
): void => {
  if (ctx.principal.id === userId) {
    throw new ForbiddenError();
  }
};

const validateGrantRows = (
  grants: RoleGrantTuple[],
  registry: PolicyRegistry,
): void => {
  for (const grant of grants) {
    validateGrantTuple(
      {
        surfaceId: grant.surface_id,
        fieldId: grant.field_id,
        action: grant.action as "read" | "write",
      },
      registry,
    );
  }
};

const createUserRolesDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<UserRolesRow, string[]> => ({
  get: (id) => loadUserRolesRow(pool, id),
  list: async () => ({ rows: [], total: 0 }),
  upsert: async () => {
    // Identity columns on latch_users are read-only until party link (task 10+).
  },
  delete: async () => {
    throw new ForbiddenError();
  },
  getRelated: (userId) => loadUserRoleIds(pool, userId),
  replaceRelated: async (userId, roleIds) => {
    if (!(await allRoleIdsExist(pool, roleIds))) {
      throw new ValidationError("Unknown role id in role_assignments");
    }
    await assertNotLastSystemRoleHolder(pool, userId, roleIds);
    const actorId = await getActorId();
    await replaceUserRoles(pool, actorId, userId, roleIds);
  },
  isRowVisibleToPrincipal: async (entityId) =>
    (await loadUserRolesRow(pool, entityId)) !== undefined,
});

const createRoleDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
  registry: PolicyRegistry,
): StoreAdapter<RoleDetailRow, RoleDetailStoreRelated> => ({
  get: (id) => loadRoleDetailRow(pool, id),
  list: async () => ({ rows: [], total: 0 }),
  upsert: async (row) => {
    const actorId = await getActorId();
    const existing = await loadRoleDetailRow(pool, row.id);
    if (!existing || isSystemRoleClass(existing.role_class)) {
      return;
    }
    await updateRoleDisplayName(pool, actorId, row.id, row.display_name);
  },
  delete: async (id) => {
    const actorId = await getActorId();
    const row = await loadRoleDetailRow(pool, id);
    if (!row) {
      return;
    }
    if (isSystemRoleClass(row.role_class)) {
      throw new ForbiddenError();
    }
    await deleteAppRole(pool, actorId, id);
  },
  getRelated: (roleId) => loadRoleDetailRelated(pool, roleId),
  replaceRelated: async (roleId, related) => {
    const actorId = await getActorId();
    const row = await loadRoleDetailRow(pool, roleId);
    if (!row || isSystemRoleClass(row.role_class)) {
      throw new ForbiddenError();
    }

    const patch = related as RoleDetailRelatedPatch;

    if (patch.surfaceBindings !== undefined) {
      await replaceRoleSurfaceBindings(
        pool,
        actorId,
        roleId,
        patch.surfaceBindings,
      );
    }

    if (patch.grants !== undefined) {
      validateGrantRows(patch.grants, registry);
      await replaceRoleGrants(pool, actorId, roleId, patch.grants);
    }
  },
  isRowVisibleToPrincipal: async (entityId) =>
    (await loadRoleDetailRow(pool, entityId)) !== undefined,
});

const wrapUserRolesPatch = (dal: SurfaceDal): SurfaceDal => ({
  ...dal,
  patch: async (ctx, id, body) => {
    assertIamSurfaceRead(ctx);
    assertNotSelfRolePatch(ctx, id);
    return dal.patch(ctx, id, body);
  },
});

const wrapRoleDetailPatch = (
  dal: SurfaceDal,
  pool: Pool,
  registry: PolicyRegistry,
): SurfaceDal => ({
  ...dal,
  patch: async (ctx, id, body) => {
    assertIamSurfaceRead(ctx);

    const row = await loadRoleDetailRow(pool, id);
    if (!row) {
      return dal.patch(ctx, id, body);
    }

    if (isSystemRoleClass(row.role_class)) {
      const parsed = roleDetailDescriptor.patchSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError("Validation failed", parsed.error.flatten());
      }

      const hasCatalogEdit =
        parsed.data.catalog !== undefined &&
        Object.keys(parsed.data.catalog).length > 0;
      const hasBindingEdit = parsed.data.surface_bindings !== undefined;
      const hasGrantEdit = parsed.data.grants !== undefined;

      if (hasCatalogEdit || hasBindingEdit || hasGrantEdit) {
        throw new ForbiddenError();
      }

      return dal.patch(ctx, id, body);
    }

    const parsed = roleDetailDescriptor.patchSchema.safeParse(body);
    if (parsed.success && parsed.data.grants !== undefined) {
      validateGrantRows(
        parsed.data.grants.map(
          (grant: {
            surface_id: string;
            field_id: string | null;
            action: string;
            mode?: string | null;
          }) => ({
            surface_id: grant.surface_id,
            field_id: grant.field_id,
            action: grant.action,
            mode: grant.mode ?? null,
          }),
        ),
        registry,
      );
    }

    return dal.patch(ctx, id, body);
  },
  delete: async (ctx, id) => {
    assertIamSurfaceRead(ctx);
    const row = await loadRoleDetailRow(pool, id);
    if (row && isSystemRoleClass(row.role_class)) {
      throw new ForbiddenError();
    }
    return dal.delete(ctx, id);
  },
});

export const createIamDal = (options: CreateIamDalOptions): IamDal => {
  const registry = options.registry ?? subhubRegistry;
  const { pool, getActorId } = options;

  const userListStore = createUserListStore(pool, getActorId);
  const userDetailStore = createUserDetailStore(pool, getActorId);
  const roleListStore = createRoleListStore(pool, getActorId);
  const userRolesStore = createUserRolesDetailStore(pool, getActorId);
  const roleDetailStore = createRoleDetailStore(pool, getActorId, registry);

  const userList = withIamGate(
    createSurfaceDal(userListDescriptor, userListStore),
  );
  const userDetail = withIamGate(
    createSurfaceDal(userDetailDescriptor, userDetailStore),
  );
  const roleList = withIamGate(
    createSurfaceDal(roleListDescriptor, roleListStore),
  );

  const userRolesDetail = wrapUserRolesPatch(
    withIamGate(
      createSurfaceDal(userRolesDetailDescriptor, userRolesStore),
    ),
  );

  const roleDetail = wrapRoleDetailPatch(
    withIamGate(createSurfaceDal(roleDetailDescriptor, roleDetailStore)),
    pool,
    registry,
  );

  return {
    userList,
    userDetail,
    userRolesDetail,
    roleList,
    roleDetail,
  };
};

let iamDal: IamDal | undefined;

export const getIamDal = (): IamDal => {
  if (!iamDal) {
    throw new Error("IAM DAL not initialized — call initIamDal() first");
  }
  return iamDal;
};

export const initIamDal = (options: CreateIamDalOptions): IamDal => {
  iamDal = createIamDal(options);
  return iamDal;
};

export const ensureIamDal = async (): Promise<IamDal> => {
  const { ensureAuditBootstrap: bootstrap, getPool, getPrincipal } =
    await import("../latch.js");
  await bootstrap();

  if (!iamDal) {
    initIamDal({
      pool: getPool(),
      getActorId: async () => (await getPrincipal()).id,
    });
  }

  return iamDal!;
};
