import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createSurfaceDal } from "@latch/dal";
import {
  principalWithRoles,
  type Manifest,
  type PermissionContext,
} from "@latch/contracts";
import { Pool } from "pg";

import { REPO_ROOT } from "./generate";

const widgetDatabaseUrl = (): string | undefined =>
  process.env.DATABASE_URL?.trim() || undefined;

describe("generated widget_detail store SQL", () => {
  let pool: Pool | undefined;

  afterEach(async () => {
    if (pool) {
      await pool.end();
      pool = undefined;
    }
  });

  it.runIf(Boolean(widgetDatabaseUrl()))(
    "createWidgetDetailStore + descriptor read/write end-to-end",
    async () => {
      pool = new Pool({ connectionString: widgetDatabaseUrl() });
      await pool.query(`
        CREATE TABLE IF NOT EXISTS widgets (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          status TEXT NOT NULL,
          scope_id TEXT NOT NULL
        )
      `);
      await pool.query("DELETE FROM widgets");
      await pool.query(
        `INSERT INTO widgets (id, label, status, scope_id) VALUES ($1, $2, $3, $4)`,
        ["w-store-1", "Store Alpha", "open", "scope-a"],
      );

      const gluePath = path.join(
        REPO_ROOT,
        "fixtures/codegen-fixtures/widget/generated/widget_detail.glue.generated.ts",
      );
      const storePath = path.join(
        REPO_ROOT,
        "fixtures/codegen-fixtures/widget/generated/widget_detail.store.generated.ts",
      );
      const { widgetDetailDescriptor } = await import(gluePath);
      const { createWidgetDetailStore } = await import(storePath);

      const store = createWidgetDetailStore(pool, async () => "codegen-test-actor");
      const manifest: Manifest = {
        surface: "widget_detail",
        actions: ["read", "write"],
        rowScope: "all",
        fields: {
          label: ["read", "write"],
          status: ["read"],
          branch_scope: ["read"],
        },
      };
      const ctx: PermissionContext = {
        principal: principalWithRoles("user-1", ["reader"]),
        manifest,
        surface: "widget_detail",
      };

      const dal = createSurfaceDal(widgetDetailDescriptor, store);
      const dto = await dal.get(ctx, "w-store-1");
      expect(dto.label).toEqual({ label: "Store Alpha" });
    },
  );
});
