import { describe, expect, it } from "vitest";

import {
  collapsePartSpecRows,
  expandPartSpecsForPatch,
  mergePartSpecsWithDefs,
  partSpecsToDisplayUnits,
} from "./part-specs-form";

const defs = [
  {
    spec_def_id: "def-enum",
    code: "slc",
    display_name: "SLC protocol",
    value_type: "enum" as const,
    unit_symbol: null,
    to_canonical_factor: 1,
    decimal_places: null,
    options: [
      { id: "opt-a", code: "a", display_name: "Option A" },
      { id: "opt-b", code: "b", display_name: "Option B" },
    ],
  },
  {
    spec_def_id: "def-bool",
    code: "supervised",
    display_name: "Supervised",
    value_type: "boolean" as const,
    unit_symbol: null,
    to_canonical_factor: 1,
    decimal_places: null,
    options: [],
  },
  {
    spec_def_id: "def-ton",
    code: "tonnage",
    display_name: "Tonnage",
    value_type: "number" as const,
    unit_symbol: "ton",
    to_canonical_factor: 1,
    decimal_places: 1,
    options: [],
  },
  {
    spec_def_id: "def-trip",
    code: "trip",
    display_name: "Trip band",
    value_type: "number" as const,
    unit_symbol: "mi",
    to_canonical_factor: 1609.34,
    decimal_places: 0,
    options: [],
  },
];

describe("collapsePartSpecRows", () => {
  it("merges enum rows by spec_def_id", () => {
    const collapsed = collapsePartSpecRows([
      {
        spec_def_id: "def-enum",
        value_type: "enum",
        spec_option_id: "opt-a",
      } as never,
      {
        spec_def_id: "def-enum",
        value_type: "enum",
        spec_option_id: "opt-b",
      } as never,
    ]);

    expect(collapsed).toEqual([
      expect.objectContaining({
        spec_def_id: "def-enum",
        value_type: "enum",
        spec_option_ids: ["opt-a", "opt-b"],
      }),
    ]);
  });

  it("skips sparse RHF holes and empty shells without spec_def_id", () => {
    const sparse = [] as Array<{
      spec_def_id?: string;
      value_type?: "boolean" | "enum" | "number";
      value_boolean?: boolean | null;
    }>;
    sparse[1] = { value_type: "boolean" };
    sparse[2] = {
      spec_def_id: "def-bool",
      value_type: "boolean",
      value_boolean: true,
    };

    const collapsed = collapsePartSpecRows(sparse as never);

    expect(collapsed).toEqual([
      expect.objectContaining({
        spec_def_id: "def-bool",
        value_boolean: true,
      }),
    ]);
  });
});

describe("mergePartSpecsWithDefs", () => {
  it("builds one row per contextual def", () => {
    const merged = mergePartSpecsWithDefs([], defs);

    expect(merged).toHaveLength(4);
    expect(merged[0]).toMatchObject({
      spec_def_id: "def-enum",
      spec_option_ids: [],
    });
  });

  it("preserves saved values for defs still in union", () => {
    const merged = mergePartSpecsWithDefs(
      [
        {
          spec_def_id: "def-enum",
          value_type: "enum",
          spec_option_ids: ["opt-a"],
        },
        {
          spec_def_id: "def-bool",
          value_type: "boolean",
          value_boolean: true,
        },
      ],
      defs,
    );

    expect(merged).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ spec_def_id: "def-enum", spec_option_ids: ["opt-a"] }),
        expect.objectContaining({ spec_def_id: "def-bool", value_boolean: true }),
      ]),
    );
    expect(merged).toHaveLength(4);
  });

  it("drops stale defs when union shrinks", () => {
    const merged = mergePartSpecsWithDefs(
      [
        {
          spec_def_id: "def-removed",
          value_type: "number",
          value_number: 3,
        },
        {
          spec_def_id: "def-bool",
          value_type: "boolean",
          value_boolean: false,
        },
      ],
      [defs[1]!],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.spec_def_id).toBe("def-bool");
  });

  it("filters enum selections to options still valid on def", () => {
    const merged = mergePartSpecsWithDefs(
      [
        {
          spec_def_id: "def-enum",
          value_type: "enum",
          spec_option_ids: ["opt-a", "opt-stale"],
        },
      ],
      defs,
    );

    expect(merged[0]?.spec_option_ids).toEqual(["opt-a"]);
  });

  it("hydrates number/range rows in display units", () => {
    const merged = mergePartSpecsWithDefs(
      [
        {
          spec_def_id: "def-ton",
          value_type: "number",
          value_number: 3,
        },
        {
          spec_def_id: "def-trip",
          value_type: "number",
          value_number: 16093.4,
          value_number_max: 32186.8,
        },
      ],
      defs,
    );

    expect(merged.find((row) => row.spec_def_id === "def-ton")?.value_number).toBe(3);
    expect(merged.find((row) => row.spec_def_id === "def-trip")?.value_number).toBeCloseTo(10);
    expect(
      merged.find((row) => row.spec_def_id === "def-trip")?.value_number_max,
    ).toBeCloseTo(20);
  });
});

describe("expandPartSpecsForPatch", () => {
  it("expands enum multi-select to one PATCH row per option", () => {
    const patch = expandPartSpecsForPatch([
      {
        spec_def_id: "def-enum",
        value_type: "enum",
        spec_option_ids: ["opt-a", "opt-b"],
      },
      {
        spec_def_id: "def-bool",
        value_type: "boolean",
        value_boolean: true,
      },
      {
        spec_def_id: "def-num",
        value_type: "number",
        value_number: 3,
        to_canonical_factor: 1,
      },
    ]);

    expect(patch).toEqual([
      {
        spec_def_id: "def-enum",
        spec_option_id: "opt-a",
        value_number: null,
        value_number_max: null,
        value_boolean: null,
      },
      {
        spec_def_id: "def-enum",
        spec_option_id: "opt-b",
        value_number: null,
        value_number_max: null,
        value_boolean: null,
      },
      {
        spec_def_id: "def-bool",
        spec_option_id: null,
        value_number: null,
        value_number_max: null,
        value_boolean: true,
      },
      {
        spec_def_id: "def-num",
        spec_option_id: null,
        value_number: 3,
        value_number_max: null,
        value_boolean: null,
      },
    ]);
  });

  it("converts authored display values to canonical storage units", () => {
    const patch = expandPartSpecsForPatch([
      {
        spec_def_id: "def-ton",
        display_name: "Tonnage",
        value_type: "number",
        value_number: 3,
        to_canonical_factor: 1,
      },
      {
        spec_def_id: "def-trip",
        display_name: "Trip band",
        value_type: "number",
        value_number: 10,
        value_number_max: 20,
        to_canonical_factor: 1609.34,
      },
    ]);

    expect(patch[0]?.value_number).toBe(3);
    expect(patch[1]?.value_number).toBeCloseTo(16093.4);
    expect(patch[1]?.value_number_max).toBeCloseTo(32186.8);
  });

  it("rejects range rows where min exceeds max", () => {
    expect(() =>
      expandPartSpecsForPatch([
        {
          spec_def_id: "def-trip",
          display_name: "Trip band",
          value_type: "number",
          value_number: 30,
          value_number_max: 10,
        },
      ]),
    ).toThrow(/Value min must be less than or equal to max/i);
  });
});

describe("partSpecsToDisplayUnits", () => {
  it("converts canonical stored values to def display units", () => {
    const display = partSpecsToDisplayUnits([
      {
        spec_def_id: "def-trip",
        value_type: "number",
        value_number: 16093.4,
        value_number_max: 32186.8,
        to_canonical_factor: 1609.34,
      },
    ]);

    expect(display[0]?.value_number).toBeCloseTo(10);
    expect(display[0]?.value_number_max).toBeCloseTo(20);
  });
});
