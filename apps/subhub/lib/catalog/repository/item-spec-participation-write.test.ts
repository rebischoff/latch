import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  applyCategorySpecParticipationTx,
  assertSpecDefsBelongToRoot,
} from "./item-spec-participation-write";

describe("assertSpecDefsBelongToRoot", () => {
  it("accepts defs in the scope root namespace", async () => {
    const client = {
      query: vi.fn(async () => ({ rows: [{ id: "spec-1" }] })),
    } as unknown as PoolClient;

    await expect(
      assertSpecDefsBelongToRoot(client, "fa-root", ["spec-1"]),
    ).resolves.toBeUndefined();
  });

  it("rejects defs outside the namespace", async () => {
    const client = {
      query: vi.fn(async () => ({ rows: [] })),
    } as unknown as PoolClient;

    await expect(
      assertSpecDefsBelongToRoot(client, "fa-root", ["spec-1"]),
    ).rejects.toThrow(ValidationError);
  });
});

describe("applyCategorySpecParticipationTx", () => {
  it("upserts and deletes participation rows for leaf items", async () => {
    const sqlCalls: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        sqlCalls.push(sql);
        if (sql.includes("SELECT node_type")) {
          return { rows: [{ node_type: "item" }] };
        }
        if (sql.includes("FROM spec_def")) {
          return { rows: [{ id: "spec-1" }, { id: "spec-2" }] };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await applyCategorySpecParticipationTx(client, "leaf-1", "fa-root", [
      { spec_def_id: "spec-1", active: true },
      { spec_def_id: "spec-2", active: false },
    ]);

    expect(sqlCalls.some((sql) => sql.includes("INSERT INTO item_spec_participation"))).toBe(
      true,
    );
    expect(sqlCalls.some((sql) => sql.includes("DELETE FROM item_spec_participation"))).toBe(
      true,
    );
  });

  it("rejects participation patches on non-leaf items", async () => {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("SELECT node_type")) {
          return { rows: [{ node_type: "category" }] };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await expect(
      applyCategorySpecParticipationTx(client, "branch-1", "fa-root", [
        { spec_def_id: "spec-1", active: true },
      ]),
    ).rejects.toThrow(ValidationError);
  });
});
