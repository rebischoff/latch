import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import { Pool } from "pg";

import {
  createMemoryAuditWriter,
  setAuditWriter,
} from "@latch/audit";
import {
  ForbiddenError,
  ValidationError,
  type PermissionContext,
} from "@latch/contracts";

import { spikePolicyRegistry } from "../policy-registry.js";
import {
  createPolicyServiceForPrincipal,
  loadPrincipalFromDb,
} from "../request-policy.js";
import { getPolicyVersion } from "../iam/policy-version-read.js";
import { resetMemoryPolicyVersion } from "../iam/policy-version.js";
import { FIELD_TECH_ID, OFFICE_ADMIN_ID } from "./fixture-ids.js";
import { roleAssignmentDto } from "./role-assignment.js";
import { resolveAllManifests } from "./resolve-all-manifests.js";
import { createUserRolesDetailDalForPool } from "./repository.js";

const spikePolicyDatabaseUrl = (): string | undefined => {
  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const envLocal = resolve(
    fileURLToPath(new URL("../..", import.meta.url)),
    ".env.local",
  );
  if (!existsSync(envLocal)) {
    return undefined;
  }

  for (const line of readFileSync(envLocal, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    if (trimmed.slice(0, eq).trim() !== "DATABASE_URL") {
      continue;
    }
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  }

  return undefined;
};

const audit = createMemoryAuditWriter();

afterEach(() => {
  setAuditWriter(null);
  audit.reset();
  resetMemoryPolicyVersion();
});

describe("user_roles_detail — Postgres DAL", () => {
  const pools: Pool[] = [];

  afterEach(async () => {
    await Promise.all(pools.splice(0).map((pool) => pool.end()));
  });

  const openPool = () => {
    const pool = new Pool({ connectionString: spikePolicyDatabaseUrl() });
    pools.push(pool);
    return pool;
  };

  const buildCtx = async (
    pool: Pool,
    userId: string,
  ): Promise<PermissionContext> => {
    const principal = await loadPrincipalFromDb(pool, userId);
    const policy = await createPolicyServiceForPrincipal(
      pool,
      principal,
      spikePolicyRegistry,
    );
    const manifest = policy.resolve(principal, { surface: "user_roles_detail" });
    return { principal, manifest, surface: "user_roles_detail" };
  };

  const iamActorId = async (pool: Pool): Promise<string> => {
    const result = await pool.query<{ id: string }>(
      `SELECT ur.user_id AS id
       FROM latch_user_roles ur
       INNER JOIN latch_roles r ON r.id = ur.role_id
       WHERE r.role_class = 'system_iam'
       LIMIT 1`,
    );
    const actorId = result.rows[0]?.id;
    if (!actorId) {
      throw new Error("No system_iam user in database");
    }
    return actorId;
  };

  const createTestUser = async (pool: Pool): Promise<string> => {
    const userId = `pg-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      `INSERT INTO latch_users (id, display_name) VALUES ($1, $2)`,
      [userId, "PG DAL test user"],
    );
    return userId;
  };

  const deleteTestUser = async (pool: Pool, userId: string): Promise<void> => {
    await pool.query(`DELETE FROM latch_user_roles WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM latch_users WHERE id = $1`, [userId]);
  };

  it.runIf(Boolean(spikePolicyDatabaseUrl()))(
    "patch assignments persists across new pool connection",
    async () => {
      setAuditWriter(audit.writer);
      const pool = openPool();
      const dal = createUserRolesDetailDalForPool(pool);
      const actorId = await iamActorId(pool);
      const targetId = await createTestUser(pool);
      const ctx = await buildCtx(pool, actorId);
      const versionBeforePatch = await getPolicyVersion(pool);

      try {
        const patched = await dal.patchUserRoles(ctx, targetId, {
          role_assignments: [
            roleAssignmentDto(FIELD_TECH_ID),
            roleAssignmentDto(OFFICE_ADMIN_ID),
          ],
        });
        expect(patched.role_assignments).toEqual([
          roleAssignmentDto(FIELD_TECH_ID),
          roleAssignmentDto(OFFICE_ADMIN_ID),
        ]);

        const versionAfter = await getPolicyVersion(pool);
        expect(versionAfter).toBeGreaterThan(versionBeforePatch);

        const freshPool = openPool();
        const freshDal = createUserRolesDetailDalForPool(freshPool);
        const reloaded = await freshDal.getUserRoles(ctx, targetId);
        expect(reloaded.role_assignments).toEqual([
          roleAssignmentDto(FIELD_TECH_ID),
          roleAssignmentDto(OFFICE_ADMIN_ID),
        ]);
      } finally {
        await deleteTestUser(pool, targetId);
      }
    },
    30_000,
  );

  it.runIf(Boolean(spikePolicyDatabaseUrl()))(
    "self-patch throws ForbiddenError",
    async () => {
      setAuditWriter(audit.writer);
      const pool = openPool();
      const dal = createUserRolesDetailDalForPool(pool);
      const actorId = await iamActorId(pool);
      const ctx = await buildCtx(pool, actorId);

      await expect(
        dal.patchUserRoles(ctx, actorId, {
          role_assignments: [],
        }),
      ).rejects.toThrow(ForbiddenError);
    },
  );

  it.runIf(Boolean(spikePolicyDatabaseUrl()))(
    "rejects system_data + app exclusivity on patch",
    async () => {
      setAuditWriter(audit.writer);
      const pool = openPool();
      const dal = createUserRolesDetailDalForPool(pool);
      const actorId = await iamActorId(pool);
      const targetId = await createTestUser(pool);
      const ctx = await buildCtx(pool, actorId);

      const systemData = await pool.query<{ id: string }>(
        `SELECT id FROM latch_roles WHERE role_class = 'system_data' LIMIT 1`,
      );
      const systemDataId = systemData.rows[0]!.id;

      try {
        await expect(
          dal.patchUserRoles(ctx, targetId, {
            role_assignments: [
              roleAssignmentDto(systemDataId),
              roleAssignmentDto(FIELD_TECH_ID),
            ],
          }),
        ).rejects.toThrow(ValidationError);
      } finally {
        await deleteTestUser(pool, targetId);
      }
    },
  );

  it.runIf(Boolean(spikePolicyDatabaseUrl()))(
    "createUser persists across new pool connection",
    async () => {
      setAuditWriter(audit.writer);
      const pool = openPool();
      const dal = createUserRolesDetailDalForPool(pool);
      const actorId = await iamActorId(pool);
      const ctx = await buildCtx(pool, actorId);
      const userId = `pg-create-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      try {
        const created = await dal.createUser(ctx, {
          id: userId,
          display_name: "PG create test",
        });
        expect(created.id).toBe(userId);
        expect(created.profile?.display_name).toBe("PG create test");

        const freshPool = openPool();
        const freshDal = createUserRolesDetailDalForPool(freshPool);
        const reloaded = await freshDal.getUserRoles(ctx, userId);
        expect(reloaded.profile?.display_name).toBe("PG create test");
        expect(reloaded.role_assignments ?? []).toEqual([]);
      } finally {
        await deleteTestUser(pool, userId);
      }
    },
    30_000,
  );

  it.runIf(Boolean(spikePolicyDatabaseUrl()))(
    "createUser with initial roles bumps policy version and persists assignments",
    async () => {
      setAuditWriter(audit.writer);
      const pool = openPool();
      const dal = createUserRolesDetailDalForPool(pool);
      const actorId = await iamActorId(pool);
      const ctx = await buildCtx(pool, actorId);
      const userId = `pg-create-roles-${Date.now()}`;
      const versionBefore = await getPolicyVersion(pool);

      try {
        const created = await dal.createUser(ctx, {
          id: userId,
          display_name: "PG create with roles",
          role_assignments: [roleAssignmentDto(FIELD_TECH_ID)],
        });
        expect(created.role_assignments).toEqual([roleAssignmentDto(FIELD_TECH_ID)]);

        const versionAfter = await getPolicyVersion(pool);
        expect(versionAfter).toBeGreaterThan(versionBefore);

        const freshPool = openPool();
        const freshDal = createUserRolesDetailDalForPool(freshPool);
        const reloaded = await freshDal.getUserRoles(ctx, userId);
        expect(reloaded.role_assignments).toEqual([roleAssignmentDto(FIELD_TECH_ID)]);
      } finally {
        await deleteTestUser(pool, userId);
      }
    },
    30_000,
  );

  it.runIf(Boolean(spikePolicyDatabaseUrl()))(
    "createUser rejects duplicate id",
    async () => {
      setAuditWriter(audit.writer);
      const pool = openPool();
      const dal = createUserRolesDetailDalForPool(pool);
      const actorId = await iamActorId(pool);
      const targetId = await createTestUser(pool);
      const ctx = await buildCtx(pool, actorId);

      try {
        await expect(
          dal.createUser(ctx, {
            id: targetId,
            display_name: "Duplicate",
          }),
        ).rejects.toThrow(ValidationError);
      } finally {
        await deleteTestUser(pool, targetId);
      }
    },
  );

  it.runIf(Boolean(spikePolicyDatabaseUrl()))(
    "resolveAllManifests merges overlapping app roles (unionGrants + mergeRowScope)",
    async () => {
      setAuditWriter(audit.writer);
      const pool = openPool();
      const dal = createUserRolesDetailDalForPool(pool);
      const actorId = await iamActorId(pool);
      const targetId = await createTestUser(pool);
      const ctx = await buildCtx(pool, actorId);

      try {
        await dal.patchUserRoles(ctx, targetId, {
          role_assignments: [
            roleAssignmentDto("b1000001-0000-4000-8000-000000000003"),
            roleAssignmentDto("b1000001-0000-4000-8000-000000000004"),
          ],
        });

        const manifests = await resolveAllManifests(
          pool,
          targetId,
          spikePolicyRegistry,
        );
        const alphaList = manifests.alpha_list;
        expect(alphaList.rowScope).toBe("all");
        expect(alphaList.fields.status).toEqual(
          expect.arrayContaining(["read", "write"]),
        );
      } finally {
        await deleteTestUser(pool, targetId);
      }
    },
    30_000,
  );
});
