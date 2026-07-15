import { describe, expect, it } from "vitest";

import {
  buildConditionDraft,
  fingerprintConditionDraft,
  fingerprintConditionDraftSpecs,
  toConditionDraftSpecs,
} from "./condition-draft";
import { EstimatePartPickerRequestSchema } from "./repository/estimate-part-picker";
import { makeCondition } from "@/components/estimates/estimate-line-tree";

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

  it("changes when labor_only flips", () => {
    const off = fingerprintConditionDraft({ labor_only: false, specs: [] });
    const on = fingerprintConditionDraft({ labor_only: true, specs: [] });
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

describe("buildConditionDraft", () => {
  it("sends effective form specs so child inherits unsaved root clears", () => {
    const conditions = [
      makeCondition({
        id: "root-1",
        name: "Fire Alarm",
        specs: [
          {
            spec_def_id: "series",
            spec_option_id: null,
            value_boolean: null,
            value_number: null,
            value_number_max: null,
          },
          {
            spec_def_id: "protocol",
            spec_option_id: "flashscan",
            value_boolean: null,
            value_number: null,
            value_number_max: null,
          },
        ],
        conditions: [
          makeCondition({
            id: "child-1",
            name: "New condition",
            parent_condition_id: "root-1",
            specs: [
              {
                spec_def_id: "series",
                spec_option_id: null,
                value_boolean: null,
                value_number: null,
                value_number_max: null,
              },
              {
                spec_def_id: "protocol",
                spec_option_id: null,
                value_boolean: null,
                value_number: null,
                value_number_max: null,
              },
              {
                spec_def_id: "color",
                spec_option_id: "red",
                value_boolean: null,
                value_number: null,
                value_number_max: null,
              },
            ],
          }),
        ],
      }),
    ];

    const draft = buildConditionDraft(conditions, "child-1");
    expect(draft?.specs?.find((s) => s.spec_def_id === "protocol")?.spec_option_id).toBe(
      "flashscan",
    );
    expect(draft?.specs?.find((s) => s.spec_def_id === "series")?.spec_option_id).toBeNull();
    expect(draft?.specs?.find((s) => s.spec_def_id === "color")?.spec_option_id).toBe("red");
  });

  it("resolves effective labor_only and include_discontinued for children", () => {
    const conditions = [
      makeCondition({
        id: "root-1",
        labor_only_explicit: true,
        labor_only: true,
        include_discontinued_explicit: true,
        include_discontinued: true,
        conditions: [
          makeCondition({
            id: "child-1",
            parent_condition_id: "root-1",
            labor_only_explicit: false,
            labor_only: false,
            include_discontinued_explicit: false,
            include_discontinued: false,
          }),
        ],
      }),
    ];

    const draft = buildConditionDraft(conditions, "child-1");
    expect(draft?.labor_only).toBe(true);
    expect(draft?.include_discontinued).toBe(true);
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
