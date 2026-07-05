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
    value_text: null,
    value_number: null,
  });
  return map;
};

const defMeta = (specDefId: string, valueType: "enum" | "boolean" | "text") =>
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
      { spec_def_id: "def-1", spec_option_id: "opt-a", value_boolean: null, value_text: null },
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
      { spec_def_id: "def-1", spec_option_id: "opt-b", value_boolean: null, value_text: null },
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
      { spec_def_id: "def-b", spec_option_id: null, value_boolean: true, value_text: null },
    ];
    const merged: MergedBucketSpecs = new Map([
      [
        "def-b",
        {
          spec_def_id: "def-b",
          spec_option_id: null,
          value_boolean: true,
          value_text: null,
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
});
