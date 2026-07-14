import { describe, expect, it } from "vitest";

import {
  fingerprintConditionDraft,
  fingerprintConditionDraftSpecs,
  toConditionDraftSpecs,
} from "./condition-draft";
import { EstimatePartPickerRequestSchema } from "./repository/estimate-part-picker";

describe("fingerprintConditionDraftSpecs", () => {
  it("returns empty for missing or empty specs", () => {
    expect(fingerprintConditionDraftSpecs(undefined)).toBe("");
    expect(fingerprintConditionDraftSpecs([])).toBe("");
  });

  it("is stable across input order", () => {
    const a = fingerprintConditionDraftSpecs([
      { spec_def_id: "b", spec_option_id: "opt-b" },
      { spec_def_id: "a", spec_option_id: "opt-a" },
    ]);
    const b = fingerprintConditionDraftSpecs([
      { spec_def_id: "a", spec_option_id: "opt-a" },
      { spec_def_id: "b", spec_option_id: "opt-b" },
    ]);
    expect(a).toBe(b);
  });

  it("changes when a filter value changes", () => {
    const blank = fingerprintConditionDraftSpecs([
      { spec_def_id: "candela", spec_option_id: null },
    ]);
    const high = fingerprintConditionDraftSpecs([
      { spec_def_id: "candela", spec_option_id: "high" },
    ]);
    expect(blank).not.toBe(high);
  });
});

describe("fingerprintConditionDraft", () => {
  it("changes when include_discontinued flips", () => {
    const off = fingerprintConditionDraft({ include_discontinued: false, specs: [] });
    const on = fingerprintConditionDraft({ include_discontinued: true, specs: [] });
    expect(off).not.toBe(on);
  });
});

describe("toConditionDraftSpecs", () => {
  it("includes number max for draft bucket parity", () => {
    expect(
      toConditionDraftSpecs([
        {
          spec_def_id: "def-1",
          spec_option_id: null,
          value_boolean: null,
          value_number: 15,
          value_number_max: 30,
        },
      ]),
    ).toEqual([
      {
        spec_def_id: "def-1",
        spec_option_id: null,
        value_boolean: null,
        value_number: 15,
        value_number_max: 30,
      },
    ]);
  });
});

describe("EstimatePartPickerRequestSchema", () => {
  it("accepts draft specs for POST parts picker", () => {
    const parsed = EstimatePartPickerRequestSchema.safeParse({
      item_id: "item-1",
      estimate_condition_id: "cond-1",
      condition_draft: {
        specs: [
          {
            spec_def_id: "def-1",
            spec_option_id: "opt-a",
          },
        ],
        include_discontinued: true,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown keys (strict)", () => {
    const parsed = EstimatePartPickerRequestSchema.safeParse({
      item_id: "item-1",
      estimate_condition_id: "cond-1",
      extra: true,
    });
    expect(parsed.success).toBe(false);
  });

  it("allows empty draft (blank bucket → full linked pool)", () => {
    const parsed = EstimatePartPickerRequestSchema.safeParse({
      item_id: "item-1",
      estimate_condition_id: "cond-1",
      condition_draft: { specs: [] },
    });
    expect(parsed.success).toBe(true);
  });
});
