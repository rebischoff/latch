import { describe, expect, it } from "vitest";


import {
  partMatchesBucket,
  type PartSpecRow,
} from "./estimate-part-resolver";
import type { MergedBucketSpecs } from "./estimate-bucket-specs";


const bucket = (
  specDefId: string,
  overrides: Partial<MergedBucketSpecs extends Map<string, infer V> ? V : never> = {},
): MergedBucketSpecs => {
  const map: MergedBucketSpecs = new Map();
  map.set(specDefId, {
    spec_def_id: specDefId,
    spec_option_id: null,
    value_boolean: null,
    value_number: null,
    value_number_max: null,
    ...overrides,
  });
  return map;
};

const defMeta = (specDefId: string, valueType: "enum" | "boolean" | "number") =>
  new Map([[specDefId, { spec_def_id: specDefId, value_type: valueType, wildcard_option_id: null }]]);

describe("partMatchesBucket", () => {
  it("passes when bucket value is blank", () => {
    const specs: PartSpecRow[] = [];
    const effective = new Set(["def-1"]);
    const merged: MergedBucketSpecs = new Map();

    expect(
      partMatchesBucket(specs, merged, effective, defMeta("def-1", "enum")),
    ).toBe(true);
  });

  it("passes set enum bucket when part has no rows for def (37ai V5 wildcard)", () => {
    const specs: PartSpecRow[] = [];
    const merged = bucket("def-1", { spec_option_id: "opt-a" });

    expect(
      partMatchesBucket(
        specs,
        merged,
        new Set(["def-1"]),
        defMeta("def-1", "enum")),
    ).toBe(true);
  });

  it("matches enum option on part row", () => {
    const specs: PartSpecRow[] = [
      {
        spec_def_id: "def-1",
        spec_option_id: "opt-a",
        value_boolean: null,
        value_number: null,
        value_number_max: null,
      },
    ];

    expect(
      partMatchesBucket(
        specs,
        bucket("def-1", { spec_option_id: "opt-a" }),
        new Set(["def-1"]),
        defMeta("def-1", "enum")),
    ).toBe(true);
  });

  it("fails enum when part lacks matching option", () => {
    const specs: PartSpecRow[] = [
      {
        spec_def_id: "def-1",
        spec_option_id: "opt-b",
        value_boolean: null,
        value_number: null,
        value_number_max: null,
      },
    ];

    expect(
      partMatchesBucket(
        specs,
        bucket("def-1", { spec_option_id: "opt-a" }),
        new Set(["def-1"]),
        defMeta("def-1", "enum")),
    ).toBe(false);
  });

  it("matches boolean equality", () => {
    const specs: PartSpecRow[] = [
      {
        spec_def_id: "def-b",
        spec_option_id: null,
        value_boolean: true,
        value_number: null,
        value_number_max: null,
      },
    ];
    const merged = bucket("def-b", { value_boolean: true });

    expect(
      partMatchesBucket(
        specs,
        merged,
        new Set(["def-b"]),
        defMeta("def-b", "boolean")),
    ).toBe(true);
  });

  it("passes when number/range bucket filter is blank", () => {
    const specs: PartSpecRow[] = [
      {
        spec_def_id: "def-ton",
        spec_option_id: null,
        value_boolean: null,
        value_number: 3,
        value_number_max: null,
      },
    ];
    const merged = bucket("def-ton");

    expect(
      partMatchesBucket(
        specs,
        merged,
        new Set(["def-ton", "def-trip"]),
        new Map([
          ["def-ton", { spec_def_id: "def-ton", value_type: "number", wildcard_option_id: null }],
          ["def-trip", { spec_def_id: "def-trip", value_type: "number", wildcard_option_id: null }],
        ]),
              ),
    ).toBe(true);
  });

  it("matches exact tonnage and range band (HVAC-style matrix)", () => {
    const tonnageDef = "def-tonnage";
    const tripDef = "def-trip";
    const meta = new Map([
      [tonnageDef, { spec_def_id: tonnageDef, value_type: "number" as const, wildcard_option_id: null }],
      [tripDef, { spec_def_id: tripDef, value_type: "number" as const, wildcard_option_id: null }],
    ]);
    const effective = new Set([tonnageDef, tripDef]);

    const merged: MergedBucketSpecs = new Map([
      [
        tonnageDef,
        {
          spec_def_id: tonnageDef,
          spec_option_id: null,
          value_boolean: null,
          value_number: 3,
          value_number_max: 3,
        },
      ],
      [
        tripDef,
        {
          spec_def_id: tripDef,
          spec_option_id: null,
          value_boolean: null,
          value_number: 15,
          value_number_max: 15,
        },
      ],
    ]);

    const matchingPart: PartSpecRow[] = [
      {
        spec_def_id: tonnageDef,
        spec_option_id: null,
        value_boolean: null,
        value_number: 3,
        value_number_max: null,
      },
      {
        spec_def_id: tripDef,
        spec_option_id: null,
        value_boolean: null,
        value_number: 10,
        value_number_max: 20,
      },
    ];

    expect(partMatchesBucket(matchingPart, merged, effective, meta)).toBe(true);

    const wrongTonnage: PartSpecRow[] = [
      {
        spec_def_id: tonnageDef,
        spec_option_id: null,
        value_boolean: null,
        value_number: 4,
        value_number_max: null,
      },
      matchingPart[1]!,
    ];
    expect(partMatchesBucket(wrongTonnage, merged, effective, meta)).toBe(false);

    const wrongBand: PartSpecRow[] = [
      matchingPart[0]!,
      {
        spec_def_id: tripDef,
        spec_option_id: null,
        value_boolean: null,
        value_number: 5,
        value_number_max: 12,
      },
    ];
    expect(partMatchesBucket(wrongBand, merged, effective, meta)).toBe(false);
  });

  it("matches ≥135 bucket against part band [150,185]", () => {
    const defId = "def-candela-num";
    const specs: PartSpecRow[] = [
      {
        spec_def_id: defId,
        spec_option_id: null,
        value_boolean: null,
        value_number: 150,
        value_number_max: 185,
      },
    ];
    const merged = bucket(defId, { value_number: 135, value_number_max: null });

    expect(
      partMatchesBucket(
        specs,
        merged,
        new Set([defId]),
        defMeta(defId, "number")),
    ).toBe(true);
  });

  it("matches Candela High enum bucket against part option set", () => {
    const defId = "def-candela";
    const specs: PartSpecRow[] = [
      {
        spec_def_id: defId,
        spec_option_id: "opt-high",
        value_boolean: null,
        value_number: null,
        value_number_max: null,
      },
    ];
    const merged = bucket(defId, { spec_option_id: "opt-high" });

    expect(
      partMatchesBucket(
        specs,
        merged,
        new Set([defId]),
        defMeta(defId, "enum")),
    ).toBe(true);
  });
});
