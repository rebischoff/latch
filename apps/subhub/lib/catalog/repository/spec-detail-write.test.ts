import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  assertSpecOptionDeletable,
  createSpecDetailTx,
  patchSpecDetailTx,
} from "./spec-detail-write";

describe("createSpecDetailTx", () => {
  it("inserts spec_def and enum options", async () => {
    const sqlCalls: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        sqlCalls.push(sql);
        if (sql.includes("SELECT node_type")) {
          return { rows: [{ node_type: "scope" }] };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await createSpecDetailTx(
      client,
      "spec-1",
      {
        scope_root_id: "fa-root",
        display_name: "SLC protocol",
        value_type: "enum",
      },
      [{ display_name: "LiteSpeed" }],
    );

    expect(sqlCalls.some((sql) => sql.includes("INSERT INTO spec_def"))).toBe(true);
    expect(sqlCalls.some((sql) => sql.includes("INSERT INTO spec_option"))).toBe(true);
  });
});

describe("patchSpecDetailTx", () => {
  it("blocks scope_root_id reassign when in use", async () => {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("scope_root_item_id, value_type")) {
          return { rows: [{ scope_root_item_id: "fa-root", value_type: "enum" }] };
        }
        if (sql.includes("item_spec_participation")) {
          return { rows: [{ count: 2 }] };
        }
        if (sql.includes("manufacturer_part_spec")) {
          return { rows: [{ count: 0 }] };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await expect(
      patchSpecDetailTx(client, "spec-1", { scope_root_id: "other-root" }, undefined),
    ).rejects.toThrow(ValidationError);
  });
});

describe("assertSpecOptionDeletable", () => {
  it("rejects removal when parts reference the option", async () => {
    const client = {
      query: vi.fn(async () => ({ rows: [{ count: 3 }] })),
    } as unknown as PoolClient;

    await expect(assertSpecOptionDeletable(client, "opt-1")).rejects.toThrow(ValidationError);
  });
});
