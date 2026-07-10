import { describe, expect, it } from "vitest";

import {
  defaultBucketSelection,
  filterLinesForSelection,
  parseSelectionFromTreeKey,
  resolveBucketBinding,
  selectionToTreeKey,
} from "@/components/estimates/estimate-line-selection";
import {
  makeLine,
  makeCondition,
  type EstimateConditionFormRow,
} from "@/components/estimates/estimate-line-tree";

const baseRoot = (
  overrides: Partial<EstimateConditionFormRow> = {},
): EstimateConditionFormRow =>
  makeCondition({
    id: "root-1",
    name: "Intrusion",
    root_item_id: "item-root",
    root_item_name: "Intrusion",
    labor_phases_explicit: true,
    ...overrides,
  });

describe("parseSelectionFromTreeKey / selectionToTreeKey", () => {
  it("round-trips condition keys", () => {
    const selection = parseSelectionFromTreeKey("condition:cond-1");
    expect(selection).toEqual({
      estimateConditionId: "cond-1",
    });
    expect(selectionToTreeKey(selection!)).toBe("condition:cond-1");
  });

  it("rejects scope keys", () => {
    expect(parseSelectionFromTreeKey("scope:est-scope-1")).toBeNull();
  });
});

describe("defaultBucketSelection", () => {
  it("selects first root condition", () => {
    expect(defaultBucketSelection([baseRoot()])).toEqual({
      estimateConditionId: "root-1",
    });
  });
});

describe("resolveBucketBinding / filterLinesForSelection", () => {
  it("binds root and filters root lines only", () => {
    const child = makeCondition({ id: "cond-1", name: "Office" });
    const conditions = [baseRoot({ conditions: [child] })];
    const selection = { estimateConditionId: "root-1" };

    expect(resolveBucketBinding(conditions, selection)).toEqual({
      conditionPath: [0],
    });

    const lines = [
      makeLine({ id: "a", estimate_condition_id: "root-1" }),
      makeLine({ id: "b", estimate_condition_id: "cond-1" }),
    ];

    expect(filterLinesForSelection(lines, selection).map((l) => l.id)).toEqual([
      "a",
    ]);
  });

  it("binds child and filters child lines only", () => {
    const child = makeCondition({ id: "cond-1", name: "Office" });
    const conditions = [baseRoot({ conditions: [child] })];
    const selection = { estimateConditionId: "cond-1" };

    expect(resolveBucketBinding(conditions, selection)).toEqual({
      conditionPath: [0, 0],
    });

    const lines = [
      makeLine({ id: "a", estimate_condition_id: "root-1" }),
      makeLine({ id: "b", estimate_condition_id: "cond-1" }),
    ];

    expect(filterLinesForSelection(lines, selection).map((l) => l.id)).toEqual([
      "b",
    ]);
  });
});
