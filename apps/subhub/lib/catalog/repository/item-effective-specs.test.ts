import type { Pool } from "pg";
import { describe, expect, it } from "vitest";

import { scopePanelDefs, unionEffectiveForItems } from "./item-effective-specs";

describe("scopePanelDefs", () => {
  it("returns the full namespace for a scope root", async () => {
    const pool = {
      query: async () => ({
        rows: [
          {
            spec_def_id: "slc",
            display_name: "SLC protocol",
            value_type: "enum",
          },
          {
            spec_def_id: "color",
            display_name: "Color",
            value_type: "enum",
          },
        ],
      }),
    } as unknown as Pool;

    const defs = await scopePanelDefs(pool, "fa-root");
    expect(defs.map((row) => row.spec_def_id)).toEqual(["slc", "color"]);
  });
});

describe("unionEffectiveForItems", () => {
  it("joins item_spec_participation for linked items", async () => {
    const pool = {
      query: async (sql: string, params?: unknown[]) => {
        expect(sql).toContain("item_spec_participation");
        expect(params?.[0]).toEqual(["leaf-a", "leaf-b"]);
        return {
          rows: [
            {
              spec_def_id: "slc",
              display_name: "SLC protocol",
              value_type: "enum",
            },
          ],
        };
      },
    } as unknown as Pool;

    const defs = await unionEffectiveForItems(pool, ["leaf-a", "leaf-b"]);
    expect(defs).toHaveLength(1);
  });
});
