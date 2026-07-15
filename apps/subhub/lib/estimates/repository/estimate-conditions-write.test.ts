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

const rootZoneHandlers = {
  "FROM estimate WHERE id": { rows: [{ site_id: "site-1" }] },
  "FROM site_zone WHERE id": {
    rows: [
      {
        id: "zone-1",
        site_id: "site-1",
        parent_zone_id: null,
        root_item_id: "cat-1",
      },
    ],
  },
};

describe("replaceEstimateConditionsTx", () => {
  it("rejects removing condition referenced by line_items in same payload", async () => {
    const client = makeClient({
      ...rootZoneHandlers,
      "FROM estimate_condition WHERE estimate_id": {
        rows: [{ id: "cond-1" }],
      },
      "FROM estimate_condition WHERE id": {
        rows: [{ estimate_id: "est-1" }],
      },
      "FROM estimate_line": { rows: [] },
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
      ...rootZoneHandlers,
      "FROM estimate_condition WHERE estimate_id": { rows: [] },
      "FROM estimate_line": { rows: [] },
    });

    await expect(
      replaceEstimateConditionsTx(client, "est-1", [
        {
          name: "",
          site_zone_id: "zone-1",
          sort_order: 1,
          specs: [],
          conditions: [],
        },
      ]),
    ).rejects.toMatchObject({
      details: { field: "conditions", code: "missing_condition_name" },
    });
  });

  it("requires site_zone_id on roots", async () => {
    const client = makeClient({
      "FROM estimate WHERE id": { rows: [{ site_id: "site-1" }] },
      "FROM estimate_condition WHERE estimate_id": { rows: [] },
      "FROM estimate_line": { rows: [] },
    });

    await expect(
      replaceEstimateConditionsTx(client, "est-1", [
        {
          name: "Intrusion",
          site_zone_id: null,
          sort_order: 1,
          specs: [],
          conditions: [],
        },
      ]),
    ).rejects.toMatchObject({
      details: { field: "conditions", code: "missing_site_zone" },
    });
  });

  it("rejects duplicate site_zone_id on two roots", async () => {
    const client = makeClient({
      ...rootZoneHandlers,
      "FROM estimate_condition WHERE estimate_id": { rows: [] },
      "FROM estimate_line": { rows: [] },
    });

    await expect(
      replaceEstimateConditionsTx(client, "est-1", [
        {
          name: "Bldg A",
          site_zone_id: "zone-1",
          sort_order: 1,
          specs: [],
          conditions: [],
        },
        {
          name: "Bldg A again",
          site_zone_id: "zone-1",
          sort_order: 2,
          specs: [],
          conditions: [],
        },
      ]),
    ).rejects.toMatchObject({
      details: { field: "conditions", code: "duplicate_site_zone" },
    });
  });

  it("rejects child with site_zone_id set", async () => {
    const client = makeClient({
      ...rootZoneHandlers,
      "FROM estimate_condition WHERE estimate_id": { rows: [] },
      "FROM estimate_line": { rows: [] },
    });

    await expect(
      replaceEstimateConditionsTx(client, "est-1", [
        {
          id: "root-1",
          name: "Intrusion",
          site_zone_id: "zone-1",
          sort_order: 1,
          specs: [],
          conditions: [
            {
              name: "Office",
              site_zone_id: "zone-1",
              sort_order: 1,
              specs: [],
              conditions: [],
            },
          ],
        },
      ]),
    ).rejects.toMatchObject({
      details: { field: "conditions", code: "child_site_zone" },
    });
  });
});
