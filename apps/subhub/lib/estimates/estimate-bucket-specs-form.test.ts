import { describe, expect, it } from "vitest";

import {
  isBucketSpecValueSet,
  mergeBucketSpecLayers,
  resolveEffectiveBucketSpecs,
  resolveEffectiveComplexityFactorId,
  resolveEffectiveLaborPhases,
} from "./estimate-bucket-specs-form";
import type { EstimateConditionFormRow } from "@/components/estimates/estimate-line-tree";
import { makeCondition } from "@/components/estimates/estimate-line-tree";

const conditionSpec = (
  specDefId: string,
  overrides: Partial<EstimateConditionFormRow["specs"][number]> = {},
): EstimateConditionFormRow["specs"][number] => ({
  spec_def_id: specDefId,
  def_display_name: specDefId,
  value_type: "enum",
  spec_option_id: null,
  value_boolean: null,
  value_number: null,
  ...overrides,
});

describe("resolveEffectiveBucketSpecs", () => {
  it("returns root specs at the root path", () => {
    const conditions: EstimateConditionFormRow[] = [
      makeCondition({
        id: "root-1",
        name: "Fire Alarm",
        root_item_id: "root",
        specs: [
          conditionSpec("slc", {
            spec_option_id: "opt-a",
            option_display_name: "LiteSpeed",
          }),
          conditionSpec("color"),
        ],
      }),
    ];

    const effective = resolveEffectiveBucketSpecs(conditions, [0]);
    expect(effective).toHaveLength(2);
    expect(effective.find((row) => row.spec_def_id === "slc")?.spec_option_id).toBe(
      "opt-a",
    );
  });

  it("inherits root values on child conditions when child values are blank", () => {
    const conditions: EstimateConditionFormRow[] = [
      makeCondition({
        id: "root-1",
        name: "Fire Alarm",
        root_item_id: "root",
        specs: [
          conditionSpec("slc", {
            spec_option_id: "opt-a",
            option_display_name: "LiteSpeed",
          }),
        ],
        conditions: [
          makeCondition({
            id: "c1",
            name: "Office",
            specs: [conditionSpec("slc")],
          }),
        ],
      }),
    ];

    const effective = resolveEffectiveBucketSpecs(conditions, [0, 0]);
    expect(effective.find((row) => row.spec_def_id === "slc")?.spec_option_id).toBe(
      "opt-a",
    );
  });

  it("child override wins over root default", () => {
    const conditions: EstimateConditionFormRow[] = [
      makeCondition({
        id: "root-1",
        name: "Fire Alarm",
        root_item_id: "root",
        specs: [
          conditionSpec("slc", {
            spec_option_id: "opt-a",
            option_display_name: "LiteSpeed",
          }),
        ],
        conditions: [
          makeCondition({
            id: "c1",
            name: "Office",
            specs: [
              conditionSpec("slc", {
                spec_option_id: "opt-b",
                option_display_name: "Legacy",
              }),
            ],
          }),
        ],
      }),
    ];

    const effective = resolveEffectiveBucketSpecs(conditions, [0, 0]);
    expect(effective.find((row) => row.spec_def_id === "slc")?.spec_option_id).toBe(
      "opt-b",
    );
  });
});

describe("resolveEffectiveComplexityFactorId", () => {
  it("walks leaf to root for first non-null factor", () => {
    const conditions = [
      makeCondition({
        id: "root-1",
        complexity_factor_id: "cf-root",
        conditions: [
          makeCondition({
            id: "c1",
            complexity_factor_id: null,
          }),
        ],
      }),
    ];

    expect(resolveEffectiveComplexityFactorId(conditions, [0, 0])).toBe("cf-root");
    expect(resolveEffectiveComplexityFactorId(conditions, [0])).toBe("cf-root");
  });
});

describe("resolveEffectiveLaborPhases", () => {
  it("uses nearest explicit phase set including empty", () => {
    const conditions = [
      makeCondition({
        id: "root-1",
        labor_phases_explicit: true,
        included_labor_phases: [{ labor_phase_id: "p1" }],
        conditions: [
          makeCondition({
            id: "c1",
            labor_phases_explicit: true,
            included_labor_phases: [],
          }),
        ],
      }),
    ];

    expect(resolveEffectiveLaborPhases(conditions, [0, 0])).toEqual([]);
    expect(resolveEffectiveLaborPhases(conditions, [0])).toEqual([
      { labor_phase_id: "p1" },
    ]);
  });
});

describe("isBucketSpecValueSet", () => {
  it("treats null enum option as unset", () => {
    expect(isBucketSpecValueSet(conditionSpec("slc"))).toBe(false);
    expect(
      isBucketSpecValueSet(conditionSpec("slc", { spec_option_id: "opt-a" })),
    ).toBe(true);
  });

  it("treats max-only number bucket as set", () => {
    expect(
      isBucketSpecValueSet(
        conditionSpec("amps", {
          value_type: "number",
          value_number: null,
          value_number_max: 135,
        }),
      ),
    ).toBe(true);
  });
});

describe("mergeBucketSpecLayers", () => {
  it("skips blank overrides in later layers", () => {
    const merged = mergeBucketSpecLayers([
      [conditionSpec("slc", { spec_option_id: "opt-a" })],
      [conditionSpec("slc")],
    ]);

    expect(merged[0]?.spec_option_id).toBe("opt-a");
  });
});
