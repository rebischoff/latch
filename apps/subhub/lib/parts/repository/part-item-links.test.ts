import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  replaceItemLinksTx,
  type ItemLinkPatchRow,
} from "./part-item-links";

vi.mock("./part-specs", () => ({
  prunePartSpecsToContextTx: vi.fn(async () => 0),
}));

import { prunePartSpecsToContextTx } from "./part-specs";

const createMockClient = (state: {
  items: Set<string>;
  links: Array<{ part_id: string; item_id: string; sort_order: number }>;
}) => {
  const client = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes("SELECT id FROM item")) {
        const itemIds = params?.[0] as string[];
        return {
          rows: itemIds.filter((id) => state.items.has(id)).map((id) => ({ id })),
        };
      }

      if (sql.startsWith("DELETE FROM part_item")) {
        const partId = params?.[0] as string;
        state.links = state.links.filter((row) => row.part_id !== partId);
        return { rows: [] };
      }

      if (sql.startsWith("INSERT INTO part_item")) {
        state.links.push({
          part_id: params?.[0] as string,
          item_id: params?.[1] as string,
          sort_order: params?.[2] as number,
        });
        return { rows: [] };
      }

      return { rows: [] };
    }),
  };

  return client as unknown as PoolClient;
};

describe("replaceItemLinksTx", () => {
  it("replaces rows and assigns sort_order from index", async () => {
    const state = {
      items: new Set(["item-a", "item-b"]),
      links: [{ part_id: "part-1", item_id: "old-item", sort_order: 1 }],
    };
    const client = createMockClient(state);

    const rows: ItemLinkPatchRow[] = [
      { item_id: "item-a" },
      { item_id: "item-b", sort_order: 9 },
    ];

    await replaceItemLinksTx(client, "part-1", rows);

    expect(state.links).toEqual([
      { part_id: "part-1", item_id: "item-a", sort_order: 1 },
      { part_id: "part-1", item_id: "item-b", sort_order: 9 },
    ]);
  });

  it("deletes omitted rows on replace", async () => {
    const state = {
      items: new Set(["item-a"]),
      links: [
        { part_id: "part-1", item_id: "item-a", sort_order: 1 },
        { part_id: "part-1", item_id: "item-b", sort_order: 2 },
      ],
    };
    const client = createMockClient(state);

    await replaceItemLinksTx(client, "part-1", [{ item_id: "item-a" }]);

    expect(state.links).toEqual([{ part_id: "part-1", item_id: "item-a", sort_order: 1 }]);
    expect(prunePartSpecsToContextTx).toHaveBeenCalledWith(client, "part-1");
  });

  it("rejects duplicate item_id values", async () => {
    const state = {
      items: new Set(["item-a"]),
      links: [],
    };
    const client = createMockClient(state);

    await expect(
      replaceItemLinksTx(client, "part-1", [
        { item_id: "item-a" },
        { item_id: "item-a" },
      ]),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects unknown item_id", async () => {
    const state = {
      items: new Set(["item-a"]),
      links: [],
    };
    const client = createMockClient(state);

    await expect(
      replaceItemLinksTx(client, "part-1", [{ item_id: "missing-item" }]),
    ).rejects.toMatchObject({
      details: { field: "item_links", code: "unknown_item" },
    });
  });
});
