import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { InUseError } from "../../errors";

import { replaceCatalogTable } from "./catalog-tables";
import { specUnitConfig } from "./spec-units";

vi.mock("@latch/pg-session", () => ({
  withPermissionDb: async (
    _pool: unknown,
    _actorId: string,
    fn: (client: PoolClient) => Promise<void>,
  ) => {
    await fn(mockClient as PoolClient);
  },
}));

let mockClient: PoolClient;

describe("specUnitConfig", () => {
  it("blocks delete when spec_def references the unit", async () => {
    mockClient = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("FROM spec_def")) {
          return { rows: [{ count: 2 }] };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    const blockers = await specUnitConfig.deleteBlockers!(mockClient, "unit-1");
    expect(blockers).toEqual([{ type: "spec_def.unit_id", count: 2 }]);
  });

  it("insertValues defaults conversion factor to 1", () => {
    const values = specUnitConfig.insertValues(
      {
        symbol: "kA",
        name: "Kiloampere",
        dimension: "current",
        canonical_unit_id: "canonical-id",
      },
      "new-id",
    );

    expect(values).toEqual([
      "new-id",
      "kA",
      "Kiloampere",
      "current",
      "canonical-id",
      1,
      0,
    ]);
  });
});

describe("replaceSpecUnits", () => {
  it("persists symbol as unique key column", async () => {
    const sqlCalls: string[] = [];
    mockClient = {
      query: vi.fn(async (sql: string) => {
        sqlCalls.push(sql);
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await replaceCatalogTable({} as never, "actor", specUnitConfig, [
      {
        symbol: "kA",
        name: "Kiloampere",
        dimension: "current",
        canonical_unit_id: null,
        to_canonical_factor: 1000,
      },
    ]);

    expect(sqlCalls.some((sql) => sql.includes("INSERT INTO spec_unit"))).toBe(true);
    expect(sqlCalls.some((sql) => sql.includes("symbol = $2"))).toBe(false);
  });

  it("throws InUseError when deleting a referenced unit", async () => {
    mockClient = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("SELECT id FROM spec_unit")) {
          return { rows: [{ id: "used-unit" }, { id: "free-unit" }] };
        }
        if (sql.includes("FROM spec_def")) {
          return { rows: [{ count: 1 }] };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await expect(
      replaceCatalogTable({} as never, "actor", specUnitConfig, [
        { id: "free-unit", symbol: "ea", name: "Each", dimension: "count" },
      ]),
    ).rejects.toBeInstanceOf(InUseError);
  });
});
