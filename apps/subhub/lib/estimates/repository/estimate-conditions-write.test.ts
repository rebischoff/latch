import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { replaceEstimateConditionsTx } from "./estimate-conditions-write";

const makeClient = (handlers: Record<string, unknown>) =>
  ({
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      for (const [pattern, result] of Object.entries(handlers)) {
        if (sql.includes(pattern)) {
          return typeof result === "function" ? result(sql, params) : result;
        }
      }

      return { rows: [] };
    }),
  }) as unknown as PoolClient;

describe("replaceEstimateConditionsTx", () => {
  it("rejects removing condition referenced by line_items in same payload", async () => {
    const client = makeClient({
      "FROM estimate_condition WHERE estimate_id": {
        rows: [{ id: "cond-1" }],
      },
      "FROM estimate_condition WHERE id": {
        rows: [{ estimate_id: "est-1" }],
      },
      "FROM estimate_line": { rows: [] },
      "FROM item WHERE id": { rows: [{ id: "cat-1", parent_id: null }] },
      "parent_condition_id FROM estimate_condition": {
        rows: [{ id: "cond-1", parent_condition_id: null }],
      },
    });

    await expect(
      replaceEstimateConditionsTx(
        client,
        "est-1",
        [],
        [{ estimate_condition_id: "cond-1" } as never],
      ),
    ).rejects.toMatchObject({
      details: { field: "conditions", code: "condition_referenced" },
    });
    await expect(
      replaceEstimateConditionsTx(
        client,
        "est-1",
        [],
        [{ estimate_condition_id: "cond-1" } as never],
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("requires name on root conditions", async () => {
    const client = makeClient({
      "FROM estimate_condition WHERE estimate_id": { rows: [] },
      "FROM estimate_line": { rows: [] },
      "FROM item WHERE id": { rows: [{ id: "cat-1", parent_id: null }] },
    });

    await expect(
      replaceEstimateConditionsTx(client, "est-1", [
        {
          name: "",
          root_item_id: "cat-1",
          sort_order: 1,
          specs: [],
          conditions: [],
        },
      ]),
    ).rejects.toMatchObject({
      details: { field: "conditions", code: "missing_condition_name" },
    });
  });

  it("requires root_item_id on roots", async () => {
    const client = makeClient({
      "FROM estimate_condition WHERE estimate_id": { rows: [] },
      "FROM estimate_line": { rows: [] },
    });

    await expect(
      replaceEstimateConditionsTx(client, "est-1", [
        {
          name: "Intrusion",
          root_item_id: null,
          sort_order: 1,
          specs: [],
          conditions: [],
        },
      ]),
    ).rejects.toMatchObject({
      details: { field: "conditions", code: "missing_root_item" },
    });
  });
});
