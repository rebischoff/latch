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
  NotFoundError,
  ValidationError,
  type PermissionContext,
} from "@latch/contracts";
import { MemoryRoleGrantProvider, PolicyService } from "@latch/policy";

import { spikePolicyRegistry } from "../policy-registry.js";
import { foldRoleGrantRows } from "../fold-role-grants.js";
import { createPolicyServiceForPrincipal, loadPrincipalFromDb } from "../request-policy.js";
import {
  MemoryRoleStore,
  seedSystemRoles,
  type GrantRecord,
} from "./memory-role-store.js";
import {
  getMemoryPolicyVersion,
  resetMemoryPolicyVersion,
} from "./policy-version.js";
import { createRoleDetailDal } from "./repository.js";

const SYSTEM_IAM_ID = "22222222-2222-4222-8222-222222222222";
const SYSTEM_DATA_ID = "11111111-1111-4111-8111-111111111111";

const audit = createMemoryAuditWriter();

afterEach(() => {
  setAuditWriter(null);
  audit.reset();
  resetMemoryPolicyVersion();
});

const systemPrincipal = (
  classes: Array<"system_data" | "system_iam">,
  userId = "iam-admin",
) => {
  const idByClass = {
    system_data: SYSTEM_DATA_ID,
    system_iam: SYSTEM_IAM_ID,
  } as const;
  const roles = classes.map((c) => idByClass[c]);
  return {
    id: userId,
    roles,
    roleClasses: Object.fromEntries(classes.map((c) => [idByClass[c], c])),
  };
};

const buildCtx = (
  classes: Array<"system_data" | "system_iam">,
  userId = "iam-admin",
): PermissionContext => {
  const principal = systemPrincipal(classes, userId);
  const policy = new PolicyService({ registry: spikePolicyRegistry });
  const manifest = policy.resolve(principal, { surface: "role_detail" });
  return { principal, manifest, surface: "role_detail" };
};

const grantRowsFromStore = (
  store: MemoryRoleStore,
  roleIds: string[],
): ReturnType<typeof foldRoleGrantRows> => {
  const rows = roleIds.flatMap((roleId) => {
    const related = store.getRelated(roleId);
    return related.grants.map((grant: GrantRecord) => ({
      roleId,
      surfaceId: grant.surfaceId,
      fieldId: grant.fieldId,
      action: grant.action,
      rowScope:
        related.bindings.find((b) => b.surfaceId === grant.surfaceId)
          ?.rowScope ?? null,
    }));
  });
  return foldRoleGrantRows(rows);
};

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

describe("role_detail — IAM DAL (memory)", () => {
  const makeDal = () =>
    createRoleDetailDal(
      new MemoryRoleStore({ roles: seedSystemRoles() }),
      { registry: spikePolicyRegistry },
    );

  it("system_iam get returns catalog + bindings + grants fields", () => {
    setAuditWriter(audit.writer);
    const dal = makeDal();
    const dto = dal.getRole(buildCtx(["system_iam"]), SYSTEM_IAM_ID);

    expect(dto.catalog?.role_class).toBe("system_iam");
    expect(dto.surface_bindings).toEqual([]);
    expect(dto.grants).toEqual([]);
  });

  it("default deny: system_data holder gets NotFoundError on get", () => {
    const dal = makeDal();
    expect(() => dal.getRole(buildCtx(["system_data"]), SYSTEM_IAM_ID)).toThrow(
      NotFoundError,
    );
  });

  it("strict write (T1): unknown patch key rejects", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryRoleStore({ roles: seedSystemRoles() });
    const dal = createRoleDetailDal(store, { registry: spikePolicyRegistry });
    const created = await dal.createRole(buildCtx(["system_iam"]), {
      display_name: "Custom",
    });

    await expect(
      dal.patchRole(buildCtx(["system_iam"]), created.id, {
        grants: [],
        extra: true,
      }),
    ).rejects.toThrow(ValidationError);

    expect(audit.entries).toHaveLength(1);
  });

  it("rejects unknown field grant at write time", async () => {
    setAuditWriter(audit.writer);
    const dal = makeDal();
    const created = await dal.createRole(buildCtx(["system_iam"]), {
      display_name: "Custom",
    });

    await expect(
      dal.patchRole(buildCtx(["system_iam"]), created.id, {
        surface_bindings: [{ surface_id: "widget_list", row_scope: "own" }],
        grants: [
          {
            surface_id: "widget_list",
            field_id: "not_a_field",
            action: "read",
          },
        ],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("built-in roles cannot be deleted", async () => {
    setAuditWriter(audit.writer);
    const dal = makeDal();

    await expect(
      dal.deleteRole(buildCtx(["system_iam"]), SYSTEM_IAM_ID),
    ).rejects.toThrow(ForbiddenError);
  });

  it("self-escalation guard (P8): cannot patch grants on a held role", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryRoleStore({ roles: seedSystemRoles() });
    const dal = createRoleDetailDal(store, { registry: spikePolicyRegistry });
    const created = await dal.createRole(buildCtx(["system_iam"]), {
      display_name: "Held role",
    });

    store.addAssignment(created.id, "iam-admin");

    const ctx: PermissionContext = {
      ...buildCtx(["system_iam"]),
      principal: {
        ...systemPrincipal(["system_iam"]),
        roles: [...systemPrincipal(["system_iam"]).roles, created.id],
        roleClasses: {
          ...systemPrincipal(["system_iam"]).roleClasses,
          [created.id]: "app",
        },
      },
    };
    const policy = new PolicyService({ registry: spikePolicyRegistry });
    ctx.manifest = policy.resolve(ctx.principal, { surface: "role_detail" });

    await expect(
      dal.patchRole(ctx, created.id, {
        grants: [
          {
            surface_id: "widget_list",
            field_id: "summary",
            action: "read",
          },
        ],
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("create → patch grants → resolve reflects new grants", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryRoleStore({ roles: seedSystemRoles() });
    const dal = createRoleDetailDal(store, { registry: spikePolicyRegistry });
    const ctx = buildCtx(["system_iam"]);

    const beforeVersion = getMemoryPolicyVersion();
    const created = await dal.createRole(ctx, { display_name: "Widget reader" });

    await dal.patchRole(ctx, created.id, {
      surface_bindings: [{ surface_id: "widget_list", row_scope: "all" }],
      grants: [
        {
          surface_id: "widget_list",
          field_id: "summary",
          action: "read",
        },
      ],
    });

    expect(getMemoryPolicyVersion()).toBe(beforeVersion + 1);

    const provider = new MemoryRoleGrantProvider(
      grantRowsFromStore(store, [created.id]),
    );
    const policy = new PolicyService({
      registry: spikePolicyRegistry,
      grantProvider: provider,
    });
    const manifest = policy.resolve(
      { id: "user-x", roles: [created.id] },
      { surface: "widget_list" },
    );

    expect(manifest.fields.summary).toEqual(["read"]);
    expect(manifest.fields.status).toEqual([]);
    expect(manifest.rowScope).toBe("all");
  });

  it("audits create, update, and delete", async () => {
    setAuditWriter(audit.writer);
    const dal = makeDal();
    const ctx = buildCtx(["system_iam"]);

    const created = await dal.createRole(ctx, { display_name: "Audited" });
    await dal.patchRole(ctx, created.id, {
      catalog: { display_name: "Audited v2" },
    });
    await dal.deleteRole(ctx, created.id);

    expect(audit.entries.map((e) => e.action)).toEqual([
      "create",
      "update",
      "delete",
    ]);
  });

  it("delete blocked when role is assigned (RESTRICT semantics)", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryRoleStore({ roles: seedSystemRoles() });
    const dal = createRoleDetailDal(store, { registry: spikePolicyRegistry });
    const created = await dal.createRole(buildCtx(["system_iam"]), {
      display_name: "Assigned",
    });
    store.addAssignment(created.id, "some-user");

    await expect(
      dal.deleteRole(buildCtx(["system_iam"]), created.id),
    ).rejects.toThrow(/revoke via user_roles_detail/);
  });
});

describe("role_detail — Postgres e2e", () => {
  const pools: Pool[] = [];

  afterEach(async () => {
    await Promise.all(pools.splice(0).map((pool) => pool.end()));
  });

  const openPool = () => {
    const pool = new Pool({ connectionString: spikePolicyDatabaseUrl() });
    pools.push(pool);
    return pool;
  };

  it.runIf(Boolean(spikePolicyDatabaseUrl()))(
    "create role in DB → assign → PolicyService.resolve reflects grants",
    async () => {
      const pool = openPool();
      const displayName = `e2e-role-${Date.now()}`;

      const insertRole = await pool.query<{ id: string }>(
        `INSERT INTO latch_roles (role_class, display_name)
         VALUES ('app', $1)
         RETURNING id`,
        [displayName],
      );
      const roleId = insertRole.rows[0]!.id;

      await pool.query(
        `INSERT INTO latch_role_surfaces (role_id, surface_id, row_scope)
         VALUES ($1, 'widget_list', 'own')`,
        [roleId],
      );
      await pool.query(
        `INSERT INTO latch_role_grants (role_id, surface_id, field_id, action)
         VALUES ($1, 'widget_list', 'summary', 'read'),
                ($1, 'widget_list', 'status', 'read')`,
        [roleId],
      );

      const testUserId = `e2e-user-${Date.now()}`;
      await pool.query(
        `INSERT INTO latch_users (id, display_name) VALUES ($1, $2)`,
        [testUserId, "E2E user"],
      );
      await pool.query(
        `INSERT INTO latch_user_roles (user_id, role_id) VALUES ($1, $2)`,
        [testUserId, roleId],
      );

      const principal = await loadPrincipalFromDb(pool, testUserId);
      const policy = await createPolicyServiceForPrincipal(
        pool,
        principal,
        spikePolicyRegistry,
      );
      const manifest = policy.resolve(principal, { surface: "widget_list" });

      expect(manifest.rowScope).toBe("own");
      expect(manifest.fields.summary).toEqual(["read"]);
      expect(manifest.fields.status).toEqual(["read"]);

      await pool.query(`DELETE FROM latch_user_roles WHERE user_id = $1`, [
        testUserId,
      ]);
      await pool.query(`DELETE FROM latch_users WHERE id = $1`, [testUserId]);
      await pool.query(`DELETE FROM latch_roles WHERE id = $1`, [roleId]);
    },
  );
});
