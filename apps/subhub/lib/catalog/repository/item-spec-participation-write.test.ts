import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import type { ItemFlatRow } from "./item-tree";
import {
  applyCategorySpecParticipationTx,
  assertSpecDefsBelongToRoot,
} from "./item-spec-participation-write";

const chainCategories: ItemFlatRow[] = [
  {
    id: "a",
    name: "a",
    parent_id: null,
    sort_order: 1,
    csi_code: null,
    freight_rate_type_id: null,
    incidental_rate_type_id: null,
    markup_type_id: null,
  },
  {
    id: "b",
    name: "b",
    parent_id: "a",
    sort_order: 1,
    csi_code: null,
    freight_rate_type_id: null,
    incidental_rate_type_id: null,
    markup_type_id: null,
  },
  {
    id: "c",
    name: "c",
    parent_id: "b",
    sort_order: 1,
    csi_code: null,
    freight_rate_type_id: null,
    incidental_rate_type_id: null,
    markup_type_id: null,
  },
  {
    id: "d",
    name: "d",
    parent_id: "c",
    sort_order: 1,
    csi_code: null,
    freight_rate_type_id: null,
    incidental_rate_type_id: null,
    markup_type_id: null,
  },
];

const def1 = "00000000-0000-4000-8000-000000000001";

const createMockClient = (state: {
  owners: Array<{ item_id: string; spec_def_id: string }>;
  excludes: Array<{ item_id: string; spec_def_id: string }>;
}) => {
  const queries: string[] = [];

  const client = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      queries.push(sql);

      if (sql.startsWith("INSERT INTO item_spec_exclude")) {
        state.excludes.push({
          item_id: params?.[0] as string,
          spec_def_id: params?.[1] as string,
        });
        return { rows: [] };
      }

      if (sql.startsWith("DELETE FROM item_spec_exclude")) {
        const categoryId = params?.[0] as string;
        const specDefId = params?.[1] as string;
        state.excludes = state.excludes.filter(
          (row) => !(row.item_id === categoryId && row.spec_def_id === specDefId),
        );
        return { rows: [] };
      }

      // assertSpecDefsBelongToRoot — owner in subtree of root.
      if (sql.includes("FROM spec_def") && sql.includes("subtree")) {
        const ids = (params?.[1] as string[]) ?? [];
        return { rows: ids.map((id) => ({ id })) };
      }

      // loadOwnerByDef — owner column on spec_def.
      if (sql.includes("FROM spec_def") && sql.includes("item_id")) {
        const ids = (params?.[0] as string[]) ?? [];
        return {
          rows: state.owners.filter((row) => ids.includes(row.spec_def_id)),
        };
      }

      if (sql.includes("FROM item_spec_exclude WHERE item_id = $1")) {
        const categoryId = params?.[0] as string;
        return {
          rows: state.excludes
            .filter((row) => row.item_id === categoryId)
            .map((row) => ({ spec_def_id: row.spec_def_id })),
        };
      }

      if (sql.includes("FROM item_spec_exclude") && !sql.includes("category_id = $1")) {
        return { rows: state.excludes };
      }

      return { rows: [] };
    }),
  } as unknown as PoolClient;

  return { client, queries, state };
};

describe("applyCategorySpecParticipationTx", () => {
  it("excludes an inherited def when participation turned off", async () => {
    const { client, state } = createMockClient({
      owners: [{ item_id: "b", spec_def_id: def1 }],
      excludes: [],
    });

    await applyCategorySpecParticipationTx(
      client,
      "c",
      "a",
      [{ spec_def_id: def1, active: false }],
      chainCategories,
    );

    expect(state.excludes).toEqual([{ item_id: "c", spec_def_id: def1 }]);
  });

  it("does not write an assignment row (assign lives on spec_def)", async () => {
    const { client, queries } = createMockClient({
      owners: [{ item_id: "b", spec_def_id: def1 }],
      excludes: [],
    });

    await applyCategorySpecParticipationTx(
      client,
      "c",
      "a",
      [{ spec_def_id: def1, active: true }],
      chainCategories,
    );

    expect(queries.some((sql) => sql.includes("category_spec_def"))).toBe(false);
  });

  it("re-includes at the excluding node by removing the local exclude", async () => {
    const { client, state } = createMockClient({
      owners: [{ item_id: "b", spec_def_id: def1 }],
      excludes: [{ item_id: "c", spec_def_id: def1 }],
    });

    await applyCategorySpecParticipationTx(
      client,
      "c",
      "a",
      [{ spec_def_id: def1, active: true }],
      chainCategories,
    );

    expect(state.excludes).toEqual([]);
  });

  it("rejects re-include below ancestor exclude", async () => {
    const { client } = createMockClient({
      owners: [{ item_id: "b", spec_def_id: def1 }],
      excludes: [{ item_id: "c", spec_def_id: def1 }],
    });

    await expect(
      applyCategorySpecParticipationTx(
        client,
        "d",
        "a",
        [{ spec_def_id: def1, active: true }],
        chainCategories,
      ),
    ).rejects.toMatchObject({
      details: { code: "reinclude_below_exclude" },
    });
  });
});

describe("assertSpecDefsBelongToRoot", () => {
  it("allows spec defs under the ancestor root", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        rows: [{ id: "def-1" }, { id: "def-2" }],
      }),
    } as unknown as PoolClient;

    await expect(
      assertSpecDefsBelongToRoot(client, "root-a", ["def-1", "def-2"]),
    ).resolves.toBeUndefined();
  });
});
