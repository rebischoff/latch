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
import { createPolicyServiceForPrincipal, loadPrincipalFromDb } from "../request-policy.js";
import { resetMemoryPolicyVersion } from "./policy-version.js";
import { getPolicyVersion } from "./policy-version-read.js";
import { createRoleDetailDalForPool } from "./repository.js";

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

describe("role_detail — Postgres DAL", () => {
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
    const manifest = policy.resolve(principal, { surface: "role_detail" });
    return { principal, manifest, surface: "role_detail" };
  };

  it.runIf(Boolean(spikePolicyDatabaseUrl()))(
    "create → patch grants → persists across new pool connection",
    async () => {
      setAuditWriter(audit.writer);
      const pool = openPool();
      const dal = createRoleDetailDalForPool(pool, {
        registry: spikePolicyRegistry,
      });

      const iamUser = await pool.query<{ id: string }>(
        `SELECT ur.user_id AS id
         FROM latch_user_roles ur
         INNER JOIN latch_roles r ON r.id = ur.role_id
         WHERE r.role_class = 'system_iam'
         LIMIT 1`,
      );
      const actorId = iamUser.rows[0]?.id;
      expect(actorId).toBeTruthy();

      const ctx = await buildCtx(pool, actorId!);
      const versionBefore = await getPolicyVersion(pool);
      const displayName = `pg-dal-${Date.now()}`;

      const created = await dal.createRole(ctx, { display_name: displayName });
      expect(created.catalog?.display_name).toBe(displayName);

      await dal.patchRole(ctx, created.id, {
        surface_bindings: [{ surface_id: "alpha_list", row_scope: "all" }],
        grants: [
          {
            surface_id: "alpha_list",
            field_id: "title",
            action: "read",
          },
        ],
      });

      const versionAfterPatch = await getPolicyVersion(pool);
      expect(versionAfterPatch).toBe(versionBefore + 1);

      const freshPool = openPool();
      const freshDal = createRoleDetailDalForPool(freshPool, {
        registry: spikePolicyRegistry,
      });
      const reloaded = await freshDal.getRole(ctx, created.id);

      expect(reloaded.grants).toEqual([
        {
          surface_id: "alpha_list",
          field_id: "title",
          action: "read",
        },
      ]);

      await dal.patchRole(ctx, created.id, {
        catalog: { display_name: `${displayName} v2` },
      });

      const versionAfterRename = await getPolicyVersion(pool);
      expect(versionAfterRename).toBe(versionAfterPatch);

      await dal.deleteRole(ctx, created.id);
      const versionAfterDelete = await getPolicyVersion(pool);
      expect(versionAfterDelete).toBe(versionAfterRename + 1);

      await expect(freshDal.getRole(ctx, created.id)).rejects.toThrow();
    },
    30_000,
  );

  it.runIf(Boolean(spikePolicyDatabaseUrl()))(
    "rejects unknown field grant at write time",
    async () => {
      setAuditWriter(audit.writer);
      const pool = openPool();
      const dal = createRoleDetailDalForPool(pool, {
        registry: spikePolicyRegistry,
      });

      const iamUser = await pool.query<{ id: string }>(
        `SELECT ur.user_id AS id
         FROM latch_user_roles ur
         INNER JOIN latch_roles r ON r.id = ur.role_id
         WHERE r.role_class = 'system_iam'
         LIMIT 1`,
      );
      const actorId = iamUser.rows[0]!.id;
      const ctx = await buildCtx(pool, actorId);

      const created = await dal.createRole(ctx, {
        display_name: `pg-invalid-${Date.now()}`,
      });

      await expect(
        dal.patchRole(ctx, created.id, {
          grants: [
            {
              surface_id: "alpha_list",
              field_id: "not_a_field",
              action: "read",
            },
          ],
        }),
      ).rejects.toThrow(ValidationError);

      await dal.deleteRole(ctx, created.id);
    },
  );

  it.runIf(Boolean(spikePolicyDatabaseUrl()))(
    "built-in roles cannot be deleted",
    async () => {
      const pool = openPool();
      const dal = createRoleDetailDalForPool(pool, {
        registry: spikePolicyRegistry,
      });

      const systemIam = await pool.query<{ id: string }>(
        `SELECT id FROM latch_roles WHERE role_class = 'system_iam' LIMIT 1`,
      );
      const roleId = systemIam.rows[0]!.id;

      const iamUser = await pool.query<{ id: string }>(
        `SELECT ur.user_id AS id
         FROM latch_user_roles ur
         WHERE ur.role_id = $1
         LIMIT 1`,
        [roleId],
      );
      const actorId = iamUser.rows[0]!.id;
      const ctx = await buildCtx(pool, actorId);

      await expect(dal.deleteRole(ctx, roleId)).rejects.toThrow(ForbiddenError);
    },
  );
});
