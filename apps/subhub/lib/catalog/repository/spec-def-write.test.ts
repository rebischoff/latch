import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  assertRootSpecDefinitionsPatch,
  replaceSpecDefinitionsTx,
} from "./spec-def-write";

describe("assertRootSpecDefinitionsPatch", () => {
  it("allows root category patches", () => {
    expect(() => assertRootSpecDefinitionsPatch(true)).not.toThrow();
  });

  it("rejects nested category patches", () => {
    expect(() => assertRootSpecDefinitionsPatch(false)).toThrow(ValidationError);
  });
});

describe("replaceSpecDefinitionsTx", () => {
  it("deletes owned defs omitted from an empty payload", async () => {
    const ownerId = "fa-initiating";
    const specDefId = "spec-b-smoke";
    const deleted: string[] = [];

    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes("SELECT id FROM spec_def WHERE item_id")) {
          return { rows: [{ id: specDefId }] };
        }
        if (sql.includes("FROM manufacturer_part_spec")) {
          return { rows: [{ count: 0 }] };
        }
        if (sql.startsWith("DELETE FROM item_spec_exclude")) {
          return { rows: [] };
        }
        if (sql.includes("SELECT id::text FROM spec_option")) {
          return { rows: [] };
        }
        if (sql.startsWith("DELETE FROM spec_option")) {
          return { rows: [] };
        }
        if (sql.startsWith("DELETE FROM spec_def")) {
          deleted.push(params?.[0] as string);
          return { rows: [] };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      }),
    } as unknown as PoolClient;

    await replaceSpecDefinitionsTx(client, ownerId, []);

    expect(deleted).toEqual([specDefId]);
  });

  it("updates enum options in place when ids are preserved", async () => {
    const ownerId = "fa-initiating";
    const defId = "spec-slc";
    const optionId = "opt-litespeed";
    const sqlCalls: string[] = [];

    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        sqlCalls.push(sql);

        if (sql.includes("SELECT id FROM spec_def WHERE item_id")) {
          return { rows: [{ id: defId }] };
        }
        if (sql.includes("INSERT INTO spec_def")) {
          return { rows: [] };
        }
        if (sql.includes("SELECT id::text FROM spec_option WHERE spec_def_id")) {
          return { rows: [{ id: optionId }] };
        }
        if (sql.includes("FROM manufacturer_part_spec")) {
          return { rows: [{ count: 0 }] };
        }
        if (sql.startsWith("INSERT INTO spec_option")) {
          expect(params?.[0]).toBe(optionId);
          expect(params?.[3]).toBe("Fire-Lite LiteSpeed (renamed)");
          return { rows: [] };
        }
        if (sql.startsWith("DELETE FROM spec_option WHERE id")) {
          throw new Error("Should not delete referenced option on rename");
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await replaceSpecDefinitionsTx(client, ownerId, [
      {
        id: defId,
        display_name: "SLC protocol",
        value_type: "enum",
        options: [
          {
            id: optionId,
            display_name: "Fire-Lite LiteSpeed (renamed)",
            sort_order: 1,
          },
        ],
      },
    ]);

    expect(sqlCalls.some((sql) => sql.startsWith("INSERT INTO spec_option"))).toBe(true);
  });

  it("blocks removal of options referenced by part compatibility rows", async () => {
    const ownerId = "fa-initiating";
    const defId = "spec-slc";
    const optionInUse = "opt-litespeed";
    const optionKept = "opt-other";

    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes("SELECT id FROM spec_def WHERE item_id")) {
          return { rows: [{ id: defId }] };
        }
        if (sql.includes("INSERT INTO spec_def")) {
          return { rows: [] };
        }
        if (sql.includes("SELECT id::text FROM spec_option WHERE spec_def_id")) {
          return { rows: [{ id: optionInUse }, { id: optionKept }] };
        }
        if (sql.includes("FROM manufacturer_part_spec") && sql.includes("spec_option_id")) {
          const optionId = params?.[0] as string;
          return { rows: [{ count: optionId === optionInUse ? 2 : 0 }] };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await expect(
      replaceSpecDefinitionsTx(client, ownerId, [
        {
          id: defId,
          display_name: "SLC protocol",
          value_type: "enum",
          options: [{ id: optionKept, display_name: "Other", sort_order: 1 }],
        },
      ]),
    ).rejects.toMatchObject({
      details: {
        field: "spec_definitions",
        code: "spec_option_in_use",
        spec_option_id: optionInUse,
        part_count: 2,
      },
    });
  });

  it("allows removing unreferenced options while keeping referenced ones", async () => {
    const ownerId = "fa-initiating";
    const defId = "spec-slc";
    const keptOption = "opt-kept";
    const removedOption = "opt-remove";
    const deletedOptionIds: string[] = [];

    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes("SELECT id FROM spec_def WHERE item_id")) {
          return { rows: [{ id: defId }] };
        }
        if (sql.includes("INSERT INTO spec_def")) {
          return { rows: [] };
        }
        if (sql.includes("SELECT id::text FROM spec_option WHERE spec_def_id")) {
          return { rows: [{ id: keptOption }, { id: removedOption }] };
        }
        if (sql.includes("FROM manufacturer_part_spec") && sql.includes("spec_option_id")) {
          return { rows: [{ count: 0 }] };
        }
        if (sql.startsWith("INSERT INTO spec_option")) {
          return { rows: [] };
        }
        if (sql.startsWith("DELETE FROM spec_option WHERE id")) {
          deletedOptionIds.push(params?.[0] as string);
          return { rows: [] };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await replaceSpecDefinitionsTx(client, ownerId, [
      {
        id: defId,
        display_name: "SLC protocol",
        value_type: "enum",
        options: [
          { id: keptOption, display_name: "Kept", sort_order: 1 },
          { id: "opt-new", display_name: "New option", sort_order: 2 },
        ],
      },
    ]);

    expect(deletedOptionIds).toEqual([removedOption]);
  });
});
