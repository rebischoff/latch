import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import { Pool } from "pg";

import { definePolicyRegistry, PolicyService } from "@latch/policy";

import { widgetListSurfacePolicyDef } from "../../spike_codegen/modules/widget/generated/widget_list.schema.generated.js";

import {
  createPolicyServiceForPrincipal,
  loadPrincipalFromDb,
  preloadRoleGrantProvider,
} from "./index.js";

const FIELD_TECH_ID = "b1000001-0000-4000-8000-000000000001";
const OFFICE_ADMIN_ID = "b1000001-0000-4000-8000-000000000002";

const widgetRegistry = definePolicyRegistry(widgetListSurfacePolicyDef);

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
    "field_tech and office_admin produce different widget_list manifests",
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
          registry: widgetRegistry,
          grantProvider,
        });

      const fieldTechManifest = policy(fieldTechProvider).resolve(
        { id: "tech", roles: [FIELD_TECH_ID] },
        { surface: "widget_list" },
      );
      const officeAdminManifest = policy(officeAdminProvider).resolve(
        { id: "admin", roles: [OFFICE_ADMIN_ID] },
        { surface: "widget_list" },
      );

      expect(fieldTechManifest.rowScope).toBe("own");
      expect(fieldTechManifest.fields.summary).toEqual(["read"]);
      expect(fieldTechManifest.fields.status).toEqual(["read"]);
      expect(fieldTechManifest.actions).toEqual([]);

      expect(officeAdminManifest.rowScope).toBe("all");
      expect(officeAdminManifest.fields.summary).toEqual(["read", "write"]);
      expect(officeAdminManifest.fields.status).toEqual(["read", "write"]);
      expect(officeAdminManifest.actions).toEqual([]);
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
        widgetRegistry,
      );

      const manifest = policy.resolve(principal, { surface: "widget_list" });

      expect(manifest.rowScope).toBe("all");
      expect(manifest.fields.summary).toEqual(["read", "write"]);
      expect(manifest.fields.status).toEqual(["read", "write"]);
      expect(manifest.actions).toEqual(["read", "write"]);
    },
  );
});
