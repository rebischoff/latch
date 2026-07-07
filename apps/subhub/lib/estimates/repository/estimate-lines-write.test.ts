import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import type { EstimateLineItemPatchRow } from "../descriptors/estimate-detail";

const validateQuotableItem = async (
  client: PoolClient,
  row: Pick<EstimateLineItemPatchRow, "id" | "item_id">,
): Promise<void> => {
  if (!row.item_id) {
    throw new ValidationError("item_id is required on lines", {
      field: "line_items",
      code: "missing_item",
      id: row.id,
    });
  }

  const { rows: nodeRows } = await client.query<{ node_type: string }>(
    `SELECT node_type FROM item WHERE id = $1`,
    [row.item_id],
  );
  if (nodeRows[0]?.node_type !== "item") {
    throw new ValidationError("item_id must reference a quotable item (leaf)", {
      field: "line_items",
      code: "item_not_selectable",
      id: row.id,
      item_id: row.item_id,
    });
  }
};

describe("estimate line item_id guard", () => {
  it("rejects scope/category anchors", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ node_type: "category" }] }),
    } as unknown as PoolClient;

    await expect(
      validateQuotableItem(client, { id: "line-1", item_id: "branch-1" }),
    ).rejects.toMatchObject({
      details: { code: "item_not_selectable" },
    });
  });

  it("accepts quotable leaf", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ node_type: "item" }] }),
    } as unknown as PoolClient;

    await expect(
      validateQuotableItem(client, { id: "line-1", item_id: "leaf-1" }),
    ).resolves.toBeUndefined();
  });
});
