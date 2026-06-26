#!/usr/bin/env node
/**
 * Task 26 stop gate — IAM role CRUD smoke (DAL + policy, no browser).
 * Usage: node --env-file=.env.local scripts/iam-role-crud-smoke.mjs
 */
import { createEnsureAuditBootstrap } from "@latch/app-kit";
import { preloadRoleGrantsFromDb } from "@latch/app-kit";
import {
  ForbiddenError,
  principalRoleIds,
  principalWithRoles,
  surfaceAllows,
} from "@latch/contracts";
import { PolicyService } from "@latch/policy";
import pg from "pg";

import { initIamDal } from "../lib/iam/dal.ts";
import { InUseError } from "../lib/errors.ts";
import { subhubRegistry } from "../lib/policy-registry.ts";

const databaseUrl =
  process.env.DATABASE_URL_DIRECT?.trim() ?? process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error("DATABASE_URL or DATABASE_URL_DIRECT is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const { ensureAuditBootstrap } = createEnsureAuditBootstrap({
  getConnections: () => ({ pool, permissionPool: pool }),
});
await ensureAuditBootstrap();

const createdRoleIds = [];

const assert = (label, condition) => {
  if (!condition) {
    throw new Error(`FAIL: ${label}`);
  }
  console.log(`  ok — ${label}`);
};

const expectThrows = async (label, fn, ErrorClass) => {
  try {
    await fn();
    throw new Error(`FAIL: ${label} — expected ${ErrorClass.name}`);
  } catch (error) {
    if (!(error instanceof ErrorClass)) {
      throw error;
    }
    console.log(`  ok — ${label}`);
  }
};

const loadMasterPrincipal = async () => {
  const result = await pool.query(
    `SELECT u.id::text AS user_id,
            array_agg(ur.role_id::text ORDER BY ur.role_id) AS role_ids,
            jsonb_object_agg(ur.role_id::text, r.role_class) AS role_classes
     FROM latch_users u
     JOIN latch_user_roles ur ON ur.user_id = u.id
     JOIN latch_roles r ON r.id = ur.role_id
     WHERE r.role_class = 'system_iam'
     GROUP BY u.id
     LIMIT 1`,
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("No system_iam user found — run /setup first");
  }
  return {
    userId: row.user_id,
    roleIds: row.role_ids,
    roleClasses: row.role_classes,
  };
};

const buildPolicy = async (roleIds) => {
  const grantProvider = await preloadRoleGrantsFromDb(pool, roleIds);
  return new PolicyService({ registry: subhubRegistry, grantProvider });
};

const buildCtx = async (policy, principal, surfaceId, entityId) => {
  const scope =
    entityId !== undefined
      ? { surface: surfaceId, entityId, mode: "detail" }
      : { surface: surfaceId, mode: "list" };
  const manifest = policy.resolve(principal, scope);
  return { principal, manifest, surface: surfaceId };
};

const readPolicyVersion = async () => {
  const result = await pool.query(
    `SELECT version::int AS version FROM latch_policy_version WHERE id = 1`,
  );
  return result.rows[0]?.version ?? 0;
};

const loadSystemRole = async (roleClass) => {
  const result = await pool.query(
    `SELECT id::text AS id, role_class, display_name
     FROM latch_roles
     WHERE role_class = $1
     LIMIT 1`,
    [roleClass],
  );
  return result.rows[0];
};

try {
  console.log("IAM role CRUD smoke — task 26 stop gate\n");

  const master = await loadMasterPrincipal();
  const policy = await buildPolicy(master.roleIds);
  const principal = principalWithRoles(master.userId, master.roleIds, {
    roleClasses: master.roleClasses,
  });

  const iamDal = initIamDal({
    pool,
    getActorId: async () => master.userId,
  });

  // 1 — list manifest grants create (New role toolbar gate)
  const listCtx = await buildCtx(policy, principal, "role_list");
  assert(
    "role_list manifest grants create",
    surfaceAllows(listCtx.manifest, "create"),
  );

  // 2 — create app role (POST /api/iam/roles)
  const created = await iamDal.roleList.create(listCtx, {
    catalog: { display_name: `Smoke role ${Date.now()}` },
    grants: [
      {
        surface_id: "part_list",
        field_id: null,
        action: "read",
        mode: null,
      },
    ],
  });
  const roleId = String(created.id);
  createdRoleIds.push(roleId);
  assert("create returns DB-assigned UUID id", /^[0-9a-f-]{36}$/i.test(roleId));

  const detailCtx = await buildCtx(policy, principal, "role_detail", roleId);
  const loaded = await iamDal.roleDetail.get(detailCtx, roleId);
  assert(
    "grant edits persist on reload",
    Array.isArray(loaded.grants) && loaded.grants.length === 1,
  );

  const versionBefore = await readPolicyVersion();
  await iamDal.roleDetail.patch(detailCtx, roleId, {
    grants: [
      {
        surface_id: "part_list",
        field_id: null,
        action: "read",
        mode: null,
      },
      {
        surface_id: "part_list",
        field_id: "summary",
        action: "read",
        mode: null,
      },
    ],
  });
  const versionAfter = await readPolicyVersion();
  assert("policy version bumps on grant replace", versionAfter > versionBefore);

  // 3 — delete blocked when assigned (direct assignment — delete pre-check only)
  await pool.query(
    `INSERT INTO latch_user_roles (user_id, role_id) VALUES ($1, $2::uuid)`,
    [master.userId, roleId],
  );

  await expectThrows(
    "delete blocked with in_use when role assigned",
    () => iamDal.roleDetail.delete(detailCtx, roleId),
    InUseError,
  );

  // 4 — unassign then delete succeeds
  await pool.query(
    `DELETE FROM latch_user_roles WHERE user_id = $1 AND role_id = $2::uuid`,
    [master.userId, roleId],
  );
  await iamDal.roleDetail.delete(detailCtx, roleId);
  createdRoleIds.pop();
  assert("delete succeeds when unassigned", true);

  // 5 — system role display_name save; grants patch forbidden
  for (const roleClass of ["system_data", "system_iam"]) {
    const systemRow = await loadSystemRole(roleClass);
    if (!systemRow) {
      throw new Error(`Missing ${roleClass} catalog row`);
    }
    const systemCtx = await buildCtx(
      policy,
      principal,
      "role_detail",
      systemRow.id,
    );
    const renamed = `${systemRow.display_name}`.replace(/ \(smoke\)$/, "") + " (smoke)";
    await iamDal.roleDetail.patch(systemCtx, systemRow.id, {
      catalog: { display_name: renamed },
    });
    const reloaded = await iamDal.roleDetail.get(systemCtx, systemRow.id);
    assert(`${roleClass} display_name save works`, reloaded.catalog?.display_name === renamed);

    await expectThrows(
      `${roleClass} grants patch forbidden`,
      () =>
        iamDal.roleDetail.patch(systemCtx, systemRow.id, {
          grants: [
            {
              surface_id: "part_list",
              field_id: null,
              action: "read",
              mode: null,
            },
          ],
        }),
      ForbiddenError,
    );

    // restore original display name
    await iamDal.roleDetail.patch(systemCtx, systemRow.id, {
      catalog: { display_name: systemRow.display_name },
    });
  }

  // 6 — P8: principal cannot patch own app role grants
  const p8Role = await iamDal.roleList.create(listCtx, {
    catalog: { display_name: `P8 smoke ${Date.now()}` },
  });
  const p8RoleId = String(p8Role.id);
  createdRoleIds.push(p8RoleId);

  const p8Principal = principalWithRoles(master.userId, [...master.roleIds, p8RoleId], {
    roleClasses: { ...master.roleClasses, [p8RoleId]: "app" },
  });
  const p8Policy = await buildPolicy(principalRoleIds(p8Principal));
  const p8DetailCtx = await buildCtx(p8Policy, p8Principal, "role_detail", p8RoleId);

  await expectThrows(
    "P8 blocks grants patch on held app role",
    () =>
      iamDal.roleDetail.patch(p8DetailCtx, p8RoleId, {
        grants: [
          {
            surface_id: "part_list",
            field_id: null,
            action: "read",
            mode: null,
          },
        ],
      }),
    ForbiddenError,
  );

  // display_name still allowed on held role
  await iamDal.roleDetail.patch(p8DetailCtx, p8RoleId, {
    catalog: { display_name: "P8 rename ok" },
  });
  assert("P8 allows display_name patch on held app role", true);

  console.log("\nAll stop-gate checks passed.");
} catch (error) {
  console.error("\nSmoke failed:", error);
  process.exitCode = 1;
} finally {
  for (const roleId of createdRoleIds) {
    await pool.query(`DELETE FROM latch_user_roles WHERE role_id = $1::uuid`, [roleId]);
    await pool.query(`DELETE FROM latch_role_grants WHERE role_id = $1::uuid`, [roleId]);
    await pool.query(`DELETE FROM latch_role_surfaces WHERE role_id = $1::uuid`, [roleId]);
    await pool.query(`DELETE FROM latch_roles WHERE id = $1::uuid AND role_class = 'app'`, [
      roleId,
    ]);
  }
  await pool.end();
}
