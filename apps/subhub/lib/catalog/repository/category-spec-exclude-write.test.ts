import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { replaceCategorySpecExcludesTx } from "./category-spec-exclude-write";

describe("replaceCategorySpecExcludesTx", () => {
  it("replaces exclude rows for a nested category", async () => {
    const queries: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes("FROM spec_def")) {
          return { rows: [{ id: "def-1" }] };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await replaceCategorySpecExcludesTx(client, "child-1", "root-1", [
      { spec_def_id: "def-1" },
    ]);

    expect(queries.some((sql) => sql.includes("DELETE FROM category_spec_exclude"))).toBe(
      true,
    );
    expect(queries.some((sql) => sql.includes("INSERT INTO category_spec_exclude"))).toBe(
      true,
    );
  });

  it("rejects spec_def_id outside root namespace", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as PoolClient;

    await expect(
      replaceCategorySpecExcludesTx(client, "child-1", "root-1", [
        { spec_def_id: "def-1" },
      ]),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
