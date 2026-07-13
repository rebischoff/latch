import { describe, expect, it } from "vitest";

import {
  bucketSpecMatchesPartRows,
  enumOptionSetMatches,
  numberBucketMatchesPartRows,
  numericIntervalsOverlap,
  type PartSpecMatchRow,
  type ThresholdPresetMatchMeta,
} from "./spec-match";

const partRow = (overrides: Partial<PartSpecMatchRow> = {}): PartSpecMatchRow => ({
  spec_option_id: null,
  value_boolean: null,
  value_number: null,
  value_number_max: null,
  ...overrides,
});

describe("numericIntervalsOverlap", () => {
  it("detects overlap for one-sided bucket ≥135 vs part band [150,185]", () => {
    expect(numericIntervalsOverlap(135, Number.POSITIVE_INFINITY, 150, 185)).toBe(true);
    expect(
      numberBucketMatchesPartRows(135, null, [
        partRow({ value_number: 150, value_number_max: 185 }),
      ]),
    ).toBe(true);
  });

  it("rejects non-overlapping bands", () => {
    expect(
      numberBucketMatchesPartRows(135, null, [
        partRow({ value_number: 50, value_number_max: 100 }),
      ]),
    ).toBe(false);
  });

  it("matches exact degenerate bucket [v,v] against part point", () => {
    expect(
      numberBucketMatchesPartRows(3, 3, [partRow({ value_number: 3, value_number_max: null })]),
    ).toBe(true);
    expect(
      numberBucketMatchesPartRows(3, 3, [partRow({ value_number: 4, value_number_max: null })]),
    ).toBe(false);
  });
});

describe("enumOptionSetMatches", () => {
  it("matches when part carries any option from preset set", () => {
    const presetSet = new Set(["135", "150", "177", "185"]);
    expect(
      enumOptionSetMatches(presetSet, [partRow({ spec_option_id: "150" })], null),
    ).toBe(true);
    expect(
      enumOptionSetMatches(presetSet, [partRow({ spec_option_id: "99" })], null),
    ).toBe(false);
  });

  it("passes when part has no rows for the def (37ai V5 wildcard)", () => {
    expect(enumOptionSetMatches(new Set(["opt-a"]), [], null)).toBe(true);
  });
});

describe("numberBucketMatchesPartRows", () => {
  it("passes when part has no rows for the def (37ai V5 wildcard)", () => {
    expect(numberBucketMatchesPartRows(135, null, [])).toBe(true);
  });

  it("fails when a row exists but numeric bounds are blank", () => {
    expect(numberBucketMatchesPartRows(135, null, [partRow()])).toBe(false);
  });
});

describe("bucketSpecMatchesPartRows", () => {
  const candelaPreset: ThresholdPresetMatchMeta = {
    id: "preset-high",
    spec_def_id: "def-candela",
    option_ids: ["135", "150", "177", "185"],
    value_number: null,
    value_number_max: null,
  };

  it("matches Candela High preset against part with {135,150,177}", () => {
    const bucket = {
      spec_option_id: null,
      spec_threshold_preset_id: "preset-high",
      value_boolean: null,
      value_number: null,
      value_number_max: null,
    };

    expect(
      bucketSpecMatchesPartRows(
        bucket,
        [
          partRow({ spec_option_id: "135" }),
          partRow({ spec_option_id: "150" }),
          partRow({ spec_option_id: "177" }),
        ],
        "enum",
        candelaPreset,
        null,
      ),
    ).toBe(true);
  });

  it("passes blank bucket regardless of part rows", () => {
    const blankBucket = {
      spec_option_id: null,
      spec_threshold_preset_id: null,
      value_boolean: null,
      value_number: null,
      value_number_max: null,
    };

    expect(
      bucketSpecMatchesPartRows(blankBucket, [], "enum", undefined, null),
    ).toBe(true);
    expect(
      bucketSpecMatchesPartRows(
        blankBucket,
        [partRow({ spec_option_id: "opt-a" })],
        "enum",
        undefined,
        null,
      ),
    ).toBe(true);
  });

  it("passes set enum bucket when part has no rows (37ai V5 wildcard)", () => {
    const bucket = {
      spec_option_id: "opt-a",
      spec_threshold_preset_id: null,
      value_boolean: null,
      value_number: null,
      value_number_max: null,
    };

    expect(
      bucketSpecMatchesPartRows(bucket, [], "enum", undefined, null),
    ).toBe(true);
  });

  it("passes set boolean bucket when part has no rows (37ai V5 wildcard)", () => {
    const bucket = {
      spec_option_id: null,
      spec_threshold_preset_id: null,
      value_boolean: true,
      value_number: null,
      value_number_max: null,
    };

    expect(
      bucketSpecMatchesPartRows(bucket, [], "boolean", undefined, null),
    ).toBe(true);
  });

  it("passes HVAC-style exact tonnage + trip band matrix", () => {
    const tonnageBucket = {
      spec_option_id: null,
      spec_threshold_preset_id: null,
      value_boolean: null,
      value_number: 3,
      value_number_max: 3,
    };
    const tripBucket = {
      spec_option_id: null,
      spec_threshold_preset_id: null,
      value_boolean: null,
      value_number: 15,
      value_number_max: 15,
    };

    const matchingPart: PartSpecMatchRow[] = [
      partRow({ value_number: 3 }),
      partRow({ value_number: 10, value_number_max: 20 }),
    ];

    expect(
      bucketSpecMatchesPartRows(tonnageBucket, matchingPart, "number", undefined, null),
    ).toBe(true);
    expect(
      bucketSpecMatchesPartRows(tripBucket, matchingPart, "number", undefined, null),
    ).toBe(true);

    expect(
      bucketSpecMatchesPartRows(
        tonnageBucket,
        [partRow({ value_number: 4 }), matchingPart[1]!],
        "number",
        undefined,
        null,
      ),
    ).toBe(false);

    expect(
      bucketSpecMatchesPartRows(
        tripBucket,
        [matchingPart[0]!, partRow({ value_number: 5, value_number_max: 12 })],
        "number",
        undefined,
        null,
      ),
    ).toBe(false);
  });
});
