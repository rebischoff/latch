import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  assertScopeSpecDefinitionsPatch,
  replaceScopeSpecDefinitionsTx,
} from "./item-spec-definitions-write";
import {
  assertSpecDefTypeUnitMutable,
  assertSpecDefinitionShape,
  assertSpecOptionDeletable,
} from "./spec-detail-write";

describe("assertScopeSpecDefinitionsPatch", () => {
  it("rejects non-scope nodes", () => {
    expect(() => assertScopeSpecDefinitionsPatch("category")).toThrow(ValidationError);
    expect(() => assertScopeSpecDefinitionsPatch("item")).toThrow(ValidationError);
  });
});

describe("assertSpecDefinitionShape", () => {
  it("rejects text value_type", () => {
    expect(() => assertSpecDefinitionShape("text", [], null)).toThrow(ValidationError);
  });

  it("rejects range value_type", () => {
    expect(() => assertSpecDefinitionShape("range", [], null)).toThrow(ValidationError);
  });

  it("requires unit_id for number", () => {
    expect(() => assertSpecDefinitionShape("number", [], null)).toThrow(ValidationError);
    expect(() =>
      assertSpecDefinitionShape("number", [], "a1000001-0001-4001-8001-000000000001"),
    ).not.toThrow();
  });

  it("forbids options on non-enum types", () => {
    expect(() =>
      assertSpecDefinitionShape("boolean", [{ display_name: "x" }], null),
    ).toThrow(ValidationError);
  });
});

describe("assertSpecDefTypeUnitMutable", () => {
  it("allows retype when no part value rows exist", async () => {
    const client = {
      query: vi.fn(async () => ({ rows: [{ count: 0 }] })),
    } as unknown as PoolClient;

    await expect(
      assertSpecDefTypeUnitMutable(client, "def-1", "number", "a1000001-0001-4001-8001-000000000001", {
        value_type: "boolean",
        unit_id: null,
      }),
    ).resolves.toBeUndefined();
  });

  it("blocks retype when part value rows exist", async () => {
    const client = {
      query: vi.fn(async () => ({ rows: [{ count: 2 }] })),
    } as unknown as PoolClient;

    await expect(
      assertSpecDefTypeUnitMutable(client, "def-1", "number", "a1000001-0001-4001-8001-000000000001", {
        value_type: "boolean",
        unit_id: null,
      }),
    ).rejects.toThrow(ValidationError);
  });
});

describe("replaceScopeSpecDefinitionsTx", () => {
  it("inserts spec_def and enum options for a scope root", async () => {
    const sqlCalls: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        sqlCalls.push(sql);
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await replaceScopeSpecDefinitionsTx(client, "fa-root", [
      {
        display_name: "SLC protocol",
        value_type: "enum",
        options: [{ display_name: "LiteSpeed" }],
      },
    ]);

    expect(sqlCalls.some((sql) => sql.includes("INSERT INTO spec_def"))).toBe(true);
    expect(sqlCalls.some((sql) => sql.includes("INSERT INTO spec_option"))).toBe(true);
    expect(sqlCalls.some((sql) => sql.includes("spec_threshold_preset"))).toBe(false);
  });

  it("persists unit_id and decimal_places for number defs", async () => {
    const sqlCalls: string[] = [];
    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        sqlCalls.push(sql);
        if (sql.includes("INSERT INTO spec_def") && params) {
          expect(params[4]).toBe("a1000001-0001-4001-8001-000000000001");
          expect(params[5]).toBe(2);
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await replaceScopeSpecDefinitionsTx(client, "fa-root", [
      {
        display_name: "Rated current",
        value_type: "number",
        unit_id: "a1000001-0001-4001-8001-000000000001",
        decimal_places: 2,
        options: [],
      },
    ]);

    expect(sqlCalls.some((sql) => sql.includes("INSERT INTO spec_def"))).toBe(true);
  });

  it("rejects preset fields on strict patch schema via write path shape", async () => {
    const client = {
      query: vi.fn(async () => ({ rows: [] })),
    } as unknown as PoolClient;

    await replaceScopeSpecDefinitionsTx(client, "fa-root", [
      {
        display_name: "Candela",
        value_type: "enum",
        options: [{ id: "opt-1", display_name: "Low" }],
      },
    ]);

    const sqlCalls = (client.query as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => call[0] as string,
    );
    expect(sqlCalls.some((sql) => sql.includes("spec_threshold_preset"))).toBe(false);
  });
});

describe("assertSpecOptionDeletable", () => {
  it("rejects removal when parts reference the option", async () => {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("manufacturer_part_spec")) {
          return { rows: [{ count: 3 }] };
        }
        return { rows: [{ count: 0 }] };
      }),
    } as unknown as PoolClient;

    await expect(assertSpecOptionDeletable(client, "opt-1")).rejects.toThrow(ValidationError);
  });

  it("rejects removal when estimate buckets reference the option", async () => {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("manufacturer_part_spec")) {
          return { rows: [{ count: 0 }] };
        }
        return { rows: [{ count: 1 }] };
      }),
    } as unknown as PoolClient;

    await expect(assertSpecOptionDeletable(client, "opt-1")).rejects.toThrow(ValidationError);
  });
});
