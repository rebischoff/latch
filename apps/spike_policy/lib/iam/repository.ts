import { withPermissionDb, writeAudit } from "@latch/audit";
import type { PermissionContext } from "@latch/contracts";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  fieldAllows,
  surfaceAllows,
} from "@latch/contracts";
import { createSurfaceDal } from "@latch/dal";
import type { PolicyRegistry } from "@latch/policy";
import type { Pool, PoolClient } from "pg";

import {
  RoleDetailCreateSchema,
  RoleDetailPatchSchema,
} from "../../modules/iam/generated/role_detail.schema.generated.js";
import { createRoleDetailDescriptor, roleAuditSnapshot } from "./descriptors.js";
import type { MemoryRoleStore, RoleRecord } from "./memory-role-store.js";
import type { ProjectedRoleDetail } from "./project.js";
import {
  deleteRoleFromPg,
  hydrateMemoryRoleStoreFromPg,
  persistRoleToPg,
} from "./pg-hydrate.js";
import { bumpPolicyVersion } from "./policy-version.js";
import { createRoleStoreAdapter } from "./store-adapter.js";
import { validateRoleDetailPatch } from "./validate-patch.js";

export type RoleDetailDal = {
  getRole: (
    ctx: PermissionContext,
    id: string,
  ) => ProjectedRoleDetail | Promise<ProjectedRoleDetail>;
  createRole: (
    ctx: PermissionContext,
    body: unknown,
  ) => Promise<ProjectedRoleDetail>;
  patchRole: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<ProjectedRoleDetail>;
  deleteRole: (ctx: PermissionContext, id: string) => Promise<void>;
};

export type RoleDetailDalDeps = {
  registry: PolicyRegistry;
  pool?: Pool;
};

const assertRoleDetailSurface = (ctx: PermissionContext): void => {
  if (ctx.surface !== "role_detail") {
    throw new Error(
      `Expected PermissionContext.surface "role_detail", got "${ctx.surface}"`,
    );
  }
};

const assertRoleDetailRead = (ctx: PermissionContext): void => {
  assertRoleDetailSurface(ctx);
  if (!surfaceAllows(ctx.manifest, "read")) {
    throw new NotFoundError();
  }
};

const assertRoleDetailWrite = (ctx: PermissionContext): void => {
  assertRoleDetailSurface(ctx);
  if (!surfaceAllows(ctx.manifest, "read")) {
    throw new NotFoundError();
  }
  if (!surfaceAllows(ctx.manifest, "write")) {
    throw new ForbiddenError();
  }
};

const assertRoleDetailDelete = (ctx: PermissionContext): void => {
  assertRoleDetailSurface(ctx);
  if (!surfaceAllows(ctx.manifest, "read")) {
    throw new NotFoundError();
  }
  if (!surfaceAllows(ctx.manifest, "delete")) {
    throw new ForbiddenError();
  }
};

const assertAppRole = (role: RoleRecord): void => {
  if (role.roleClass !== "app") {
    throw new ForbiddenError("System catalog roles are not editable");
  }
};

/**
 * P8: deny grant/binding edits on roles the principal holds (self-escalation guard).
 */
const assertNotSelfGrantEdit = (
  ctx: PermissionContext,
  targetRoleId: string,
  patch: { surface_bindings?: unknown; grants?: unknown },
): void => {
  if (!ctx.principal.bindings.some((b) => b.roleId === targetRoleId)) {
    return;
  }
  if (patch.surface_bindings !== undefined || patch.grants !== undefined) {
    throw new ForbiddenError();
  }
};

const patchTouchesPolicyData = (patch: {
  surface_bindings?: unknown;
  grants?: unknown;
}): boolean =>
  patch.surface_bindings !== undefined || patch.grants !== undefined;

export const createRoleDetailDal = (
  store: MemoryRoleStore,
  deps: RoleDetailDalDeps,
): RoleDetailDal => {
  const adapter = createRoleStoreAdapter(store);
  const descriptor = createRoleDetailDescriptor(store);
  const detail = createSurfaceDal(descriptor, adapter);

  return {
    getRole: (ctx, id) => {
      assertRoleDetailRead(ctx);
      return detail.get(ctx, id) as ProjectedRoleDetail;
    },

    createRole: async (ctx, body) => {
      assertRoleDetailWrite(ctx);
      if (!fieldAllows(ctx.manifest, "catalog", "write")) {
        throw new ForbiddenError();
      }

      const parsed = RoleDetailCreateSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError("Validation failed", parsed.error.flatten());
      }

      const created = store.createRole(parsed.data.display_name);
      const related = store.getRelated(created.id);
      const snapshot = roleAuditSnapshot(created, related);

      await writeAudit({
        actorId: ctx.principal.id,
        action: "insert",
        tableName: "latch_roles",
        recordId: created.id,
        moduleId: ctx.surface,
        fieldIds: ["catalog"],
        after: snapshot,
      });

      return detail.get(ctx, created.id) as ProjectedRoleDetail;
    },

    patchRole: async (ctx, id, body) => {
      assertRoleDetailWrite(ctx);

      const row = store.get(id);
      if (!row) {
        throw new NotFoundError();
      }
      assertAppRole(row);

      const parsed = RoleDetailPatchSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError("Validation failed", parsed.error.flatten());
      }

      const patch = parsed.data;
      assertNotSelfGrantEdit(ctx, id, patch);
      validateRoleDetailPatch(patch, deps.registry);

      if (
        patch.catalog?.display_name !== undefined &&
        !fieldAllows(ctx.manifest, "catalog", "write")
      ) {
        throw new ForbiddenError();
      }
      if (
        patch.surface_bindings !== undefined &&
        !fieldAllows(ctx.manifest, "surface_bindings", "write")
      ) {
        throw new ForbiddenError();
      }
      if (
        patch.grants !== undefined &&
        !fieldAllows(ctx.manifest, "grants", "write")
      ) {
        throw new ForbiddenError();
      }

      const dto = (await detail.patch(ctx, id, patch)) as ProjectedRoleDetail;

      if (patchTouchesPolicyData(patch)) {
        await bumpPolicyVersion(ctx.principal.id, deps.pool);
      }

      return dto;
    },

    deleteRole: async (ctx, id) => {
      assertRoleDetailDelete(ctx);

      const row = store.get(id);
      if (!row) {
        throw new NotFoundError();
      }
      assertAppRole(row);

      try {
        await detail.delete(ctx, id);
      } catch (error) {
        if (error instanceof ConflictError) {
          throw error;
        }
        throw error;
      }

      await bumpPolicyVersion(ctx.principal.id, deps.pool);
    },
  };
};

/** Postgres-backed `role_detail` DAL — hydrates into memory per transaction, then persists. */
export const createRoleDetailDalForPool = (
  pool: Pool,
  deps: { registry: PolicyRegistry },
): RoleDetailDal => {
  const memoryDeps = { registry: deps.registry, pool };

  type PgRoleTxn = {
    store: MemoryRoleStore;
    dal: ReturnType<typeof createRoleDetailDal>;
    client: PoolClient;
    persistRole: (roleId: string, options?: { isNew?: boolean }) => Promise<void>;
    deleteRole: (roleId: string) => Promise<void>;
  };

  const runInTransaction = async <T>(
    principalId: string,
    fn: (txn: PgRoleTxn) => Promise<T>,
  ): Promise<T> =>
    withPermissionDb(pool, principalId, async (client) => {
      const store = await hydrateMemoryRoleStoreFromPg(client);
      const dal = createRoleDetailDal(store, memoryDeps);
      const txn: PgRoleTxn = {
        store,
        dal,
        client,
        persistRole: (roleId, options) =>
          persistRoleToPg(client, store, roleId, options),
        deleteRole: (roleId) => deleteRoleFromPg(client, roleId),
      };
      return fn(txn);
    });

  return {
    getRole: (ctx, id) =>
      runInTransaction(ctx.principal.id, async ({ dal }) => dal.getRole(ctx, id)),

    createRole: (ctx, body) =>
      runInTransaction(ctx.principal.id, async ({ dal, persistRole }) => {
        const created = await dal.createRole(ctx, body);
        await persistRole(created.id, { isNew: true });
        return created;
      }),

    patchRole: (ctx, id, body) =>
      runInTransaction(ctx.principal.id, async ({ dal, persistRole }) => {
        const updated = await dal.patchRole(ctx, id, body);
        await persistRole(id);
        return updated;
      }),

    deleteRole: (ctx, id) =>
      runInTransaction(ctx.principal.id, async ({ dal, deleteRole }) => {
        await dal.deleteRole(ctx, id);
        await deleteRole(id);
      }),
  };
};
