import { withPermissionDb, writeAudit } from "@latch/audit";
import type { PermissionContext } from "@latch/contracts";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  fieldAllows,
  surfaceAllows,
} from "@latch/contracts";
import { createSurfaceDal, type StoreAdapter } from "@latch/dal";
import type { Pool, PoolClient } from "pg";

import type { UserRolesDetailPatchDto } from "../../modules/iam/generated/user_roles_detail.schema.generated.js";
import { bumpPolicyVersion } from "../iam/policy-version.js";
import {
  createUserRolesDetailDescriptor,
  userRowAuditSnapshot,
} from "./descriptors.js";
import type { MemoryUserStore, MemoryUserRecord } from "./memory-user-store.js";
import {
  hydrateMemoryUserStoreFromPg,
  persistUserRolesToPg,
  persistUserToPg,
} from "./pg-hydrate.js";
import type { ProjectedUserRolesDetail } from "./project.js";
import { loadRoleCatalogFromPg } from "./role-catalog.js";
import type { RoleCatalogEntry } from "./validate-assignments.js";
import { UserCreateSchema } from "./user-form.js";
import { validateRoleAssignmentsPatch } from "./validate-assignments.js";

export type UserCreateBody = {
  id: string;
  display_name: string;
  role_assignments?: string[];
};

export type UserRolesDetailDal = {
  getUserRoles: (
    ctx: PermissionContext,
    id: string,
  ) => ProjectedUserRolesDetail | Promise<ProjectedUserRolesDetail>;
  createUser: (
    ctx: PermissionContext,
    body: UserCreateBody,
  ) => Promise<ProjectedUserRolesDetail>;
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

const assertUserRolesDetailCreate = (ctx: PermissionContext): void => {
  assertUserRolesDetailSurface(ctx);
  if (!surfaceAllows(ctx.manifest, "read")) {
    throw new NotFoundError();
  }
  if (!surfaceAllows(ctx.manifest, "write")) {
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
  pool?: Pool;
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
    createUser: async (ctx, body) => {
      assertUserRolesDetailCreate(ctx);

      const parsed = UserCreateSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError("Validation failed", parsed.error.flatten());
      }

      const { id, display_name, role_assignments } = parsed.data;

      if (store.getUser(id)) {
        throw new ValidationError(`User id already exists: ${id}`);
      }

      if (role_assignments !== undefined && role_assignments.length > 0) {
        if (!fieldAllows(ctx.manifest, "role_assignments", "write")) {
          throw new ForbiddenError();
        }
        validateRoleAssignmentsPatch({
          actor: ctx.principal,
          targetUserId: id,
          nextRoleIds: role_assignments,
          catalog: deps.catalog,
          listUsersWithRole: (roleId) => store.listUsersWithRole(roleId),
        });
      }

      store.upsertUser({ id, displayName: display_name });
      if (role_assignments !== undefined && role_assignments.length > 0) {
        store.setUserRoles(id, role_assignments);
      }

      const row = store.getUser(id)!;
      const roleIds = store.listRolesForUser(id);
      const snapshot = userRowAuditSnapshot(row, roleIds);
      const fieldIds =
        roleIds.length > 0 ? (["profile", "role_assignments"] as const) : (["profile"] as const);

      await writeAudit({
        actorId: ctx.principal.id,
        action: "insert",
        tableName: "latch_users",
        recordId: id,
        moduleId: ctx.surface,
        fieldIds: [...fieldIds],
        after: snapshot,
      });

      if (roleIds.length > 0) {
        await bumpPolicyVersion(ctx.principal.id, deps.pool);
      }

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
        await bumpPolicyVersion(ctx.principal.id, deps.pool);
      }
      return dto;
    },
  };
};

/** Postgres-backed `user_roles_detail` DAL — hydrates into memory per transaction, then persists. */
export const createUserRolesDetailDalForPool = (
  pool: Pool,
): UserRolesDetailDal => {
  type PgUserTxn = {
    store: MemoryUserStore;
    dal: UserRolesDetailDal;
    client: PoolClient;
    persistUser: (userId: string) => Promise<void>;
    persistUserRoles: (userId: string) => Promise<void>;
  };

  const runInTransaction = async <T>(
    principalId: string,
    fn: (txn: PgUserTxn) => Promise<T>,
  ): Promise<T> =>
    withPermissionDb(pool, principalId, async (client) => {
      const store = await hydrateMemoryUserStoreFromPg(client);
      const catalog = await loadRoleCatalogFromPg(client);
      const dal = createUserRolesDetailDal(store, { catalog, pool });
      const txn: PgUserTxn = {
        store,
        dal,
        client,
        persistUser: (userId) => persistUserToPg(client, store, userId),
        persistUserRoles: (userId) => persistUserRolesToPg(client, store, userId),
      };
      return fn(txn);
    });

  return {
    getUserRoles: async (ctx, id) =>
      runInTransaction(ctx.principal.id, async ({ dal }) => dal.getUserRoles(ctx, id)),

    createUser: (ctx, body) =>
      runInTransaction(ctx.principal.id, async ({ dal, persistUser, persistUserRoles }) => {
        const created = await dal.createUser(ctx, body);
        await persistUser(created.id);
        if (body.role_assignments !== undefined && body.role_assignments.length > 0) {
          await persistUserRoles(created.id);
        }
        return created;
      }),

    patchUserRoles: (ctx, id, body) =>
      runInTransaction(ctx.principal.id, async ({ dal, persistUserRoles }) => {
        const patch = body as UserRolesDetailPatchDto;
        const updated = await dal.patchUserRoles(ctx, id, body);
        if (patch.role_assignments !== undefined) {
          await persistUserRoles(id);
        }
        return updated;
      }),
  };
};
