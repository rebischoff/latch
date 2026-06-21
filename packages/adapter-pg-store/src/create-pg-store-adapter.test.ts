import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { createSurfaceDal, type SurfaceDescriptor } from "@latch/dal";
import type { Manifest, PermissionContext } from "@latch/contracts";
import { principalWithRoles } from "@latch/contracts";
import { Pool } from "pg";

import { createPgStoreAdapter } from "./create-pg-store-adapter";

type WidgetRow = {
  id: string;
  label: string;
  status: string;
  scope_id: string;
};

const widgetDatabaseUrl = (): string | undefined =>
  process.env.DATABASE_URL?.trim() || undefined;

describe("createPgStoreAdapter", () => {
  let pool: Pool | undefined;

  afterEach(async () => {
    if (pool) {
      await pool.end();
      pool = undefined;
    }
  });

  it("implements async StoreAdapter contract in memory-like usage", async () => {
    const rows = new Map<string, WidgetRow>([
      ["w-1", { id: "w-1", label: "Alpha", status: "open", scope_id: "s-1" }],
    ]);

    const store = {
      get: async (id: string) => rows.get(id),
      list: async () => ({ rows: [...rows.values()], total: rows.size }),
      upsert: async (row: WidgetRow) => {
        rows.set(row.id, row);
      },
      delete: async (id: string) => {
        rows.delete(id);
      },
      getRelated: async () => [],
      replaceRelated: async () => {},
      isRowVisibleToPrincipal: async () => true,
    };

    const manifest: Manifest = {
      surface: "widget_detail",
      actions: ["read", "write"],
      fields: { label: ["read", "write"], status: ["read"] },
    };
    const ctx: PermissionContext = {
      principal: principalWithRoles("user-1", ["reader"]),
      manifest,
      surface: "widget_detail",
    };

    const descriptor: SurfaceDescriptor<WidgetRow> = {
      surfaceId: "widget_detail",
      anchorTable: "widgets",
      capabilities: ["detail"],
      patchSchema: z.object({ label: z.string().optional() }),
      deleteAuditFieldId: "label",
      projectRow: (row, _manifest, _related) => ({
        id: row.id,
        label: { label: row.label },
      }),
      applyPatch: (row) => row,
      auditSnapshot: (row) => ({ label: row.label }),
      canDelete: () => false,
    };

    const dal = createSurfaceDal(descriptor, store);
    const dto = await dal.get(ctx, "w-1");
    expect(dto.id).toBe("w-1");
  });

  it.runIf(Boolean(widgetDatabaseUrl()))(
    "reads and writes widgets via Postgres",
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
        ["w-pg-1", "PG Alpha", "open", "scope-a"],
      );

      const store = createPgStoreAdapter<WidgetRow>({
        pool,
        table: "widgets",
        columns: [
          { property: "label", column: "label" },
          { property: "status", column: "status" },
          { property: "scope_id", column: "scope_id" },
        ],
        getActorId: async () => "test-actor",
        scopeColumn: "scope_id",
        statusColumn: "status",
        mapRow: (row) => row as WidgetRow,
      });

      const row = await store.get("w-pg-1");
      expect(row?.label).toBe("PG Alpha");

      const listed = await store.list({
        principalId: "user-1",
        rowScope: "all",
        limit: 10,
        offset: 0,
      });
      expect(listed.total).toBeGreaterThanOrEqual(1);

      await store.upsert({
        id: "w-pg-1",
        label: "PG Beta",
        status: "closed",
        scope_id: "scope-a",
      });
      expect((await store.get("w-pg-1"))?.label).toBe("PG Beta");
    },
  );
});
