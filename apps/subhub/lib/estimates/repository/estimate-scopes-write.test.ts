import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { replaceEstimateScopesTx } from "./estimate-scopes-write";

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

describe("replaceEstimateScopesTx", () => {
  it("rejects duplicate site_scope_id in payload", async () => {
    const client = makeClient({});

    await expect(
      replaceEstimateScopesTx(client, "est-1", "site-1", [
        {
          site_scope_id: "ss-1",
          root_item_id: "cat-1",
          sort_order: 1,
          specs: [],
          zones: [],
        },
        {
          site_scope_id: "ss-1",
          root_item_id: "cat-1",
          sort_order: 2,
          specs: [],
          zones: [],
        },
      ]),
    ).rejects.toMatchObject({
      details: { field: "scopes", code: "duplicate" },
    });
    await expect(
      replaceEstimateScopesTx(client, "est-1", "site-1", [
        {
          site_scope_id: "ss-1",
          root_item_id: "cat-1",
          sort_order: 1,
          specs: [],
          zones: [],
        },
        {
          site_scope_id: "ss-1",
          root_item_id: "cat-1",
          sort_order: 2,
          specs: [],
          zones: [],
        },
      ]),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects removing scope referenced by line_items in same payload", async () => {
    const client = makeClient({
      "FROM estimate_scope WHERE estimate_id": {
        rows: [{ id: "scope-1" }],
      },
      "FROM estimate_zone ez": { rows: [] },
      "FROM estimate_line": { rows: [] },
    });

    await expect(
      replaceEstimateScopesTx(
        client,
        "est-1",
        "site-1",
        [],
        [{ estimate_scope_id: "scope-1" } as never],
      ),
    ).rejects.toMatchObject({
      details: { field: "scopes", code: "scope_referenced" },
    });
  });

  it("requires site_scope_id on scoped rows", async () => {
    const client = makeClient({
      "FROM estimate_scope WHERE estimate_id": { rows: [] },
      "FROM estimate_zone ez": { rows: [] },
      "FROM estimate_line": { rows: [] },
      "site_scope WHERE id": { rows: [] },
    });

    await expect(
      replaceEstimateScopesTx(client, "est-1", "site-1", [
        {
          site_scope_id: "",
          root_item_id: "cat-1",
          sort_order: 1,
          specs: [],
          zones: [],
        },
      ]),
    ).rejects.toMatchObject({
      details: { field: "scopes", code: "missing_site_scope" },
    });
  });
});
