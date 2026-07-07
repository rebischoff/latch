import type { Pool, PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  listDefsForItemIds,
  prunePartSpecsToContextTx,
  replacePartSpecsTx,
  type PartSpecPatchRow,
} from "./part-specs";
import { loadItemLinks } from "./part-item-links";

vi.mock("../../sites/repository/sql-utils", () => ({
  tableExists: vi.fn(async () => true),
}));

vi.mock("./part-item-links", () => ({
  loadItemLinks: vi.fn(async () => [
    { item_id: "leaf-1", name: "Leaf", breadcrumb: "Root / Leaf", sort_order: 1 },
  ]),
}));

vi.mock("../../catalog/repository/item-effective-specs", () => ({
  unionEffectiveForItems: vi.fn(async (_pool: unknown, itemIds: string[]) => {
    const defsByItem: Record<string, Array<{ spec_def_id: string; display_name: string; value_type: string }>> = {
      "smoke-detector": [
        {
          spec_def_id: "def-slc",
          display_name: "SLC protocol",
          value_type: "enum",
        },
      ],
      "notification-appliance": [
        {
          spec_def_id: "def-color",
          display_name: "Color",
          value_type: "enum",
        },
        {
          spec_def_id: "def-series",
          display_name: "Series",
          value_type: "enum",
        },
      ],
      "leaf-1": [
        {
          spec_def_id: "def-enum",
          display_name: "SLC protocol",
          value_type: "enum",
        },
        {
          spec_def_id: "def-bool",
          display_name: "Supervised",
          value_type: "boolean",
        },
        {
          spec_def_id: "def-text",
          display_name: "Label",
          value_type: "text",
        },
      ],
    };

    const unionById = new Map<string, { spec_def_id: string; display_name: string; value_type: string }>();
    for (const itemId of itemIds) {
      for (const def of defsByItem[itemId] ?? []) {
        if (!unionById.has(def.spec_def_id)) {
          unionById.set(def.spec_def_id, def);
        }
      }
    }
    return [...unionById.values()];
  }),
}));

const createMockClient = (state: {
  rows: Array<{
    manufacturer_part_id: string;
    spec_def_id: string;
    spec_option_id: string | null;
    value_text: string | null;
    value_boolean: boolean | null;
  }>;
}) => {
  const client = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes("FROM spec_def")) {
        const ids = (params?.[0] as string[]) ?? [];
        const rows = [
          {
            id: "def-enum",
            code: "slc_protocol",
            display_name: "SLC protocol",
            value_type: "enum",
          },
          {
            id: "def-bool",
            code: "supervised",
            display_name: "Supervised",
            value_type: "boolean",
          },
          {
            id: "def-text",
            code: "label",
            display_name: "Label",
            value_type: "text",
          },
          {
            id: "def-slc",
            code: "slc_protocol",
            display_name: "SLC protocol",
            value_type: "enum",
          },
          {
            id: "def-color",
            code: "color",
            display_name: "Color",
            value_type: "enum",
          },
          {
            id: "def-series",
            code: "series",
            display_name: "Series",
            value_type: "enum",
          },
        ];
        return { rows: rows.filter((row) => ids.includes(row.id)) };
      }

      if (sql.includes("FROM spec_option")) {
        return {
          rows: [
            {
              id: "opt-a",
              spec_def_id: "def-enum",
              code: "a",
              display_name: "Option A",
            },
            {
              id: "opt-b",
              spec_def_id: "def-enum",
              code: "b",
              display_name: "Option B",
            },
          ],
        };
      }

      if (sql.startsWith("DELETE FROM manufacturer_part_spec")) {
        const partId = params?.[0] as string;
        if (sql.includes("!= ALL")) {
          const allowed = new Set((params?.[1] as string[]) ?? []);
          const before = state.rows.length;
          state.rows = state.rows.filter(
            (row) =>
              row.manufacturer_part_id !== partId || allowed.has(row.spec_def_id),
          );
          return { rows: [], rowCount: before - state.rows.length };
        }

        const before = state.rows.length;
        state.rows = state.rows.filter((row) => row.manufacturer_part_id !== partId);
        return { rows: [], rowCount: before - state.rows.length };
      }

      if (sql.startsWith("INSERT INTO manufacturer_part_spec")) {
        state.rows.push({
          manufacturer_part_id: params?.[0] as string,
          spec_def_id: params?.[1] as string,
          spec_option_id: params?.[2] as string | null,
          value_text: params?.[3] as string | null,
          value_boolean: params?.[4] as boolean | null,
        });
        return { rows: [] };
      }

      return { rows: [] };
    }),
  };

  return client as unknown as PoolClient;
};

const createMockPool = () => {
  const client = createMockClient({
    rows: [] as Array<{
      manufacturer_part_id: string;
      spec_def_id: string;
      spec_option_id: string | null;
      value_text: string | null;
      value_boolean: boolean | null;
    }>,
  });
  return client as unknown as Pool;
};

describe("listDefsForItemIds", () => {
  it("returns per-item effective defs, not whole-scope union", async () => {
    const pool = createMockPool();
    const defs = await listDefsForItemIds(pool, ["smoke-detector"]);

    expect(defs).toHaveLength(1);
    expect(defs[0]).toMatchObject({
      spec_def_id: "def-slc",
      code: "slc_protocol",
      display_name: "SLC protocol",
      value_type: "enum",
    });
  });

  it("unions defs across multiple linked items", async () => {
    const pool = createMockPool();
    const defs = await listDefsForItemIds(pool, [
      "smoke-detector",
      "notification-appliance",
    ]);

    expect(defs.map((def) => def.spec_def_id).sort()).toEqual([
      "def-color",
      "def-series",
      "def-slc",
    ]);
  });
});

describe("replacePartSpecsTx", () => {
  it("persists enum multi-row, boolean, and text values", async () => {
    const state = {
      rows: [] as Array<{
        manufacturer_part_id: string;
        spec_def_id: string;
        spec_option_id: string | null;
        value_text: string | null;
        value_boolean: boolean | null;
      }>,
    };
    const client = createMockClient(state);

    const rows: PartSpecPatchRow[] = [
      { spec_def_id: "def-enum", spec_option_id: "opt-a" },
      { spec_def_id: "def-enum", spec_option_id: "opt-b" },
      { spec_def_id: "def-bool", value_boolean: true },
      { spec_def_id: "def-text", value_text: "FACP-1" },
    ];

    await replacePartSpecsTx(client, "part-1", rows);

    expect(state.rows).toHaveLength(4);
    expect(state.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          manufacturer_part_id: "part-1",
          spec_def_id: "def-enum",
          spec_option_id: "opt-a",
        }),
        expect.objectContaining({
          manufacturer_part_id: "part-1",
          spec_def_id: "def-enum",
          spec_option_id: "opt-b",
        }),
        expect.objectContaining({
          manufacturer_part_id: "part-1",
          spec_def_id: "def-bool",
          value_boolean: true,
        }),
        expect.objectContaining({
          manufacturer_part_id: "part-1",
          spec_def_id: "def-text",
          value_text: "FACP-1",
        }),
      ]),
    );
  });

  it("rejects unknown spec_def_id outside contextual union", async () => {
    const state = {
      rows: [] as Array<{
        manufacturer_part_id: string;
        spec_def_id: string;
        spec_option_id: string | null;
        value_text: string | null;
        value_boolean: boolean | null;
      }>,
    };
    const client = createMockClient(state);

    await expect(
      replacePartSpecsTx(client, "part-1", [{ spec_def_id: "def-unknown", value_text: "x" }]),
    ).rejects.toMatchObject({
      details: { field: "part_specs", code: "unknown_spec_def" },
    });
  });

  it("rejects duplicate enum option rows", async () => {
    const state = {
      rows: [] as Array<{
        manufacturer_part_id: string;
        spec_def_id: string;
        spec_option_id: string | null;
        value_text: string | null;
        value_boolean: boolean | null;
      }>,
    };
    const client = createMockClient(state);

    await expect(
      replacePartSpecsTx(client, "part-1", [
        { spec_def_id: "def-enum", spec_option_id: "opt-a" },
        { spec_def_id: "def-enum", spec_option_id: "opt-a" },
      ]),
    ).rejects.toMatchObject({
      details: { field: "part_specs", code: "duplicate" },
    });
  });
});

describe("prunePartSpecsToContextTx", () => {
  it("removes orphan spec_def rows when union shrinks", async () => {
    const state = {
      rows: [
        {
          manufacturer_part_id: "part-1",
          spec_def_id: "def-enum",
          spec_option_id: "opt-a",
          value_text: null,
          value_boolean: null,
        },
        {
          manufacturer_part_id: "part-1",
          spec_def_id: "def-stale",
          spec_option_id: null,
          value_text: "orphan",
          value_boolean: null,
        },
      ],
    };
    const client = createMockClient(state);

    vi.mocked(loadItemLinks).mockResolvedValueOnce([
      { item_id: "leaf-1", name: "Leaf", breadcrumb: "Root / Leaf", sort_order: 1 },
    ]);

    const removed = await prunePartSpecsToContextTx(client, "part-1");

    expect(removed).toBe(1);
    expect(state.rows).toEqual([
      expect.objectContaining({ spec_def_id: "def-enum" }),
    ]);
  });

  it("preserves valid rows when union grows or is unchanged", async () => {
    const state = {
      rows: [
        {
          manufacturer_part_id: "part-1",
          spec_def_id: "def-enum",
          spec_option_id: "opt-a",
          value_text: null,
          value_boolean: null,
        },
        {
          manufacturer_part_id: "part-1",
          spec_def_id: "def-bool",
          spec_option_id: null,
          value_text: null,
          value_boolean: true,
        },
      ],
    };
    const client = createMockClient(state);

    vi.mocked(loadItemLinks).mockResolvedValueOnce([
      { item_id: "leaf-1", name: "Leaf", breadcrumb: "Root / Leaf", sort_order: 1 },
    ]);

    const removed = await prunePartSpecsToContextTx(client, "part-1");

    expect(removed).toBe(0);
    expect(state.rows).toHaveLength(2);
  });

  it("removes all rows when links are cleared", async () => {
    const state = {
      rows: [
        {
          manufacturer_part_id: "part-1",
          spec_def_id: "def-enum",
          spec_option_id: "opt-a",
          value_text: null,
          value_boolean: null,
        },
      ],
    };
    const client = createMockClient(state);

    vi.mocked(loadItemLinks).mockResolvedValueOnce([]);

    const removed = await prunePartSpecsToContextTx(client, "part-1");

    expect(removed).toBe(1);
    expect(state.rows).toHaveLength(0);
  });
});
