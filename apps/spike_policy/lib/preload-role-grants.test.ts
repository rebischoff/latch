import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import { Pool } from "pg";

import { principalWithRoles } from "@latch/contracts";
import { PolicyService } from "@latch/policy";

import { spikePolicyRegistry } from "./policy-registry.js";
import {
  createPolicyServiceForPrincipal,
  loadPrincipalFromDb,
  preloadRoleGrantProvider,
} from "./index.js";

const FIELD_TECH_ID = "b1000001-0000-4000-8000-000000000001";
const OFFICE_ADMIN_ID = "b1000001-0000-4000-8000-000000000002";

const spikePolicyDatabaseUrl = (): string | undefined => {
  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const envLocal = resolve(
    fileURLToPath(new URL("..", import.meta.url)),
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
    const key = trimmed.slice(0, eq).trim();
    if (key !== "DATABASE_URL") {
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

describe("preloadRoleGrantProvider (Postgres)", () => {
  const pools: Pool[] = [];

  afterEach(async () => {
    await Promise.all(pools.splice(0).map((pool) => pool.end()));
  });

  const openPool = (): Pool => {
    const pool = new Pool({ connectionString: spikePolicyDatabaseUrl() });
    pools.push(pool);
    return pool;
  };

  it.runIf(Boolean(spikePolicyDatabaseUrl()))(
    "field_tech and office_admin produce different manifests on multiple fixture surfaces",
    async () => {
      const pool = openPool();
      const fieldTechProvider = await preloadRoleGrantProvider(pool, [
        FIELD_TECH_ID,
      ]);
      const officeAdminProvider = await preloadRoleGrantProvider(pool, [
        OFFICE_ADMIN_ID,
      ]);

      const policy = (grantProvider: Awaited<typeof fieldTechProvider>) =>
        new PolicyService({
          registry: spikePolicyRegistry,
          grantProvider,
        });

      const fieldTechAlpha = policy(fieldTechProvider).resolve(
        principalWithRoles("tech", [FIELD_TECH_ID]),
        { surface: "alpha_list" },
      );
      const officeAdminAlpha = policy(officeAdminProvider).resolve(
        principalWithRoles("admin", [OFFICE_ADMIN_ID]),
        { surface: "alpha_list" },
      );
      const fieldTechGamma = policy(fieldTechProvider).resolve(
        principalWithRoles("tech", [FIELD_TECH_ID]),
        { surface: "gamma_form" },
      );
      const officeAdminBeta = policy(officeAdminProvider).resolve(
        principalWithRoles("admin", [OFFICE_ADMIN_ID]),
        { surface: "beta_detail" },
      );

      expect(fieldTechAlpha.rowScope).toBe("own");
      expect(fieldTechAlpha.fields.title).toEqual(["read"]);
      expect(fieldTechAlpha.fields.status).toEqual(["read"]);

      expect(officeAdminAlpha.rowScope).toBe("all");
      expect(officeAdminAlpha.fields.title).toEqual(["read", "write"]);
      expect(officeAdminAlpha.fields.status).toEqual(["read", "write"]);

      expect(fieldTechGamma.rowScope).toBe("own");
      expect(fieldTechGamma.fields.request_type).toEqual(["read"]);

      expect(officeAdminBeta.rowScope).toBe("all");
      expect(officeAdminBeta.fields.headline).toEqual(["read", "write"]);
      expect(officeAdminBeta.fields.priority).toEqual(["read"]);
    },
  );

  it.runIf(Boolean(spikePolicyDatabaseUrl()))(
    "bootstrap-admin with system_data synthesizes business wildcard without grant rows",
    async () => {
      const pool = openPool();
      const principal = await loadPrincipalFromDb(pool, "bootstrap-admin");
      const policy = await createPolicyServiceForPrincipal(
        pool,
        principal,
        spikePolicyRegistry,
      );

      const manifest = policy.resolve(principal, { surface: "gamma_form" });

      expect(manifest.rowScope).toBe("all");
      expect(manifest.fields.request_type).toEqual(["read", "write"]);
      expect(manifest.fields.justification).toEqual(["read", "write"]);
      expect(manifest.fields.approver).toEqual(["read", "write"]);
      expect(manifest.actions).toEqual(["read", "write"]);
    },
  );
});
