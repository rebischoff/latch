import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { replaceCatalogTable } from "./catalog-tables";
import {
  freightRateTypeConfig,
  incidentalRateTypeConfig,
  laborRateTypeConfig,
} from "./commercial-catalogs";

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
let insertParams: unknown[][];

describe("commercial catalog table configs", () => {
  it("freight insertValues pins kind=freight", () => {
    const values = freightRateTypeConfig.insertValues(
      { name: "Standard freight", percent: 5, amount_cents: 0, sort_order: 1 },
      "freight-id",
    );

    expect(values).toEqual(["freight-id", "freight", "Standard freight", 5, 0, 1]);
  });

  it("incidental insertValues pins kind=incidental", () => {
    const values = incidentalRateTypeConfig.insertValues(
      { name: "Standard incidental", percent: 0, amount_cents: 500, sort_order: 1 },
      "incidental-id",
    );

    expect(values).toEqual([
      "incidental-id",
      "incidental",
      "Standard incidental",
      0,
      500,
      1,
    ]);
  });

  it("freight list query filters by kind", () => {
    expect(freightRateTypeConfig.filterSql).toBe("kind = 'freight'");
    expect(incidentalRateTypeConfig.filterSql).toBe("kind = 'incidental'");
  });

  it("rejects cost_add_on rows with both percent and amount blank", () => {
    expect(() =>
      freightRateTypeConfig.validateRow?.({
        name: "Invalid",
        percent: 0,
        amount_cents: 0,
      }),
    ).toThrow(ValidationError);

    try {
      freightRateTypeConfig.validateRow?.({
        name: "Invalid",
        percent: 0,
        amount_cents: 0,
      });
    } catch (error) {
      expect(error).toMatchObject({
        details: { field: "percent", code: "required_one" },
      });
    }
  });

  it("allows cost_add_on row with percent only", () => {
    expect(() =>
      freightRateTypeConfig.validateRow?.({
        name: "Percent only",
        percent: 5,
        amount_cents: 0,
      }),
    ).not.toThrow();
  });

  it("allows cost_add_on row with amount only", () => {
    expect(() =>
      incidentalRateTypeConfig.validateRow?.({
        name: "Fixed only",
        percent: 0,
        amount_cents: 250,
      }),
    ).not.toThrow();
  });
});

describe("replaceCatalogTable commercial writes", () => {
  it("persists freight kind on replace", async () => {
    insertParams = [];
    mockClient = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes("SELECT id FROM cost_add_on_type")) {
          return { rows: [] };
        }
        if (sql.startsWith("INSERT INTO cost_add_on_type")) {
          insertParams.push(params ?? []);
          return { rows: [] };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    const pool = { query: mockClient.query.bind(mockClient) } as never;

    await replaceCatalogTable(pool, "actor-1", freightRateTypeConfig, [
      { name: "Freight A", percent: 8, amount_cents: 0 },
    ]);

    expect(insertParams[0]?.[1]).toBe("freight");
  });

  it("updates existing cost_add_on row without kind in bind params", async () => {
    const updateParams: unknown[] = [];
    mockClient = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes("SELECT id FROM cost_add_on_type")) {
          return { rows: [] };
        }
        if (sql.startsWith("UPDATE cost_add_on_type")) {
          updateParams.push(...(params ?? []));
          return { rows: [] };
        }
        if (sql.includes("SELECT id FROM cost_add_on_type WHERE")) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    const pool = { query: mockClient.query.bind(mockClient) } as never;

    await replaceCatalogTable(pool, "actor-1", incidentalRateTypeConfig, [
      {
        id: "existing-id",
        name: "More",
        percent: 2,
        amount_cents: 150,
      },
    ]);

    expect(updateParams).toEqual([
      "existing-id",
      "More",
      2,
      150,
      1,
    ]);
  });

  it("rejects duplicate names in replace payload", async () => {
    mockClient = {
      query: vi.fn(async () => ({ rows: [] })),
    } as unknown as PoolClient;

    const pool = { query: mockClient.query.bind(mockClient) } as never;

    await expect(
      replaceCatalogTable(pool, "actor-1", laborRateTypeConfig, [
        { name: "Installer", rate_cents: 5000 },
        { name: "installer", rate_cents: 6000 },
      ]),
    ).rejects.toMatchObject({
      details: { field: "name", code: "duplicate" },
    });
  });
});
