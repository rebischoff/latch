import { describe, expect, it } from "vitest";

import {
  partMatchesBucket,
  type PartSpecRow,
} from "./estimate-part-resolver";
import type { MergedBucketSpecs } from "./estimate-bucket-specs";

const bucket = (specDefId: string, optionId: string | null = null): MergedBucketSpecs => {
  const map: MergedBucketSpecs = new Map();
  map.set(specDefId, {
    spec_def_id: specDefId,
    spec_option_id: optionId,
    value_boolean: null,
    value_number: null,
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

    expect(partMatchesBucket(specs, merged, effective, defMeta("def-1", "enum"))).toBe(true);
  });

  it("matches enum option on part row", () => {
    const specs: PartSpecRow[] = [
      { spec_def_id: "def-1", spec_option_id: "opt-a", value_boolean: null, value_number: null, value_number_max: null },
    ];

    expect(
      partMatchesBucket(
        specs,
        bucket("def-1", "opt-a"),
        new Set(["def-1"]),
        defMeta("def-1", "enum"),
      ),
    ).toBe(true);
  });

  it("fails enum when part lacks matching option", () => {
    const specs: PartSpecRow[] = [
      { spec_def_id: "def-1", spec_option_id: "opt-b", value_boolean: null, value_number: null, value_number_max: null },
    ];

    expect(
      partMatchesBucket(
        specs,
        bucket("def-1", "opt-a"),
        new Set(["def-1"]),
        defMeta("def-1", "enum"),
      ),
    ).toBe(false);
  });

  it("matches boolean equality", () => {
    const specs: PartSpecRow[] = [
      { spec_def_id: "def-b", spec_option_id: null, value_boolean: true, value_number: null, value_number_max: null },
    ];
    const merged: MergedBucketSpecs = new Map([
      [
        "def-b",
        {
          spec_def_id: "def-b",
          spec_option_id: null,
          value_boolean: true,
          value_number: null,
        },
      ],
    ]);

    expect(
      partMatchesBucket(
        specs,
        merged,
        new Set(["def-b"]),
        defMeta("def-b", "boolean"),
      ),
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
    const merged: MergedBucketSpecs = new Map([
      [
        "def-ton",
        {
          spec_def_id: "def-ton",
          spec_option_id: null,
          value_boolean: null,
          value_number: null,
        },
      ],
    ]);

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

    const bucket: MergedBucketSpecs = new Map([
      [tonnageDef, { spec_def_id: tonnageDef, spec_option_id: null, value_boolean: null, value_number: 3 }],
      [tripDef, { spec_def_id: tripDef, spec_option_id: null, value_boolean: null, value_number: 15 }],
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

    expect(partMatchesBucket(matchingPart, bucket, effective, meta)).toBe(true);

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
    expect(partMatchesBucket(wrongTonnage, bucket, effective, meta)).toBe(false);

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
    expect(partMatchesBucket(wrongBand, bucket, effective, meta)).toBe(false);
  });
});
