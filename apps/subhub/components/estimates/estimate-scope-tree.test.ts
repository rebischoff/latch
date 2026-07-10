import { describe, expect, it } from "vitest";

import {
  addConditionUnder,
  addRootCondition,
  buildCommercialTree,
  removeConditionById,
} from "@/components/estimates/estimate-scope-tree";
import { makeCondition } from "@/components/estimates/estimate-line-tree";

describe("buildCommercialTree", () => {
  it("builds condition forest nodes", () => {
    const conditions = [
      makeCondition({
        id: "root-1",
        name: "Bldg A",
        root_item_id: "item-root",
        conditions: [
          makeCondition({
            id: "c1",
            name: "Office",
            parent_condition_id: "root-1",
          }),
        ],
      }),
    ];

    const tree = buildCommercialTree(conditions);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.key).toBe("condition:root-1");
    expect(tree[0]?.children?.[0]?.key).toBe("condition:c1");
  });
});

describe("addRootCondition / addConditionUnder / remove", () => {
  it("adds a root condition from catalog root with spec template", () => {
    const template = [
      {
        spec_def_id: "def-slc",
        def_display_name: "SLC Protocol",
        value_type: "enum" as const,
        spec_option_id: null,
        value_boolean: null,
        value_number: null,
      },
    ];
    const next = addRootCondition([], "root-1", "Intrusion", template);
    expect(next).toHaveLength(1);
    expect(next[0]?.root_item_id).toBe("root-1");
    expect(next[0]?.labor_phases_explicit).toBe(false);
    expect(next[0]?.specs).toHaveLength(1);
    expect(next[0]?.specs[0]?.spec_def_id).toBe("def-slc");
  });

  it("adds a child condition under a root", () => {
    const conditions = [
      makeCondition({ id: "root-1", name: "Bldg A", root_item_id: "item-root" }),
    ];
    const result = addConditionUnder(conditions, "root-1");
    expect(result?.conditions[0]?.conditions).toHaveLength(1);
    expect(result?.conditions[0]?.conditions[0]?.root_item_id).toBeNull();
    expect(result?.conditionId).toBeTruthy();
  });

  it("removes conditions", () => {
    const roots = addRootCondition([], "root-1", "Intrusion");
    const withCond = addConditionUnder(roots, roots[0]!.id)!;
    const afterChildRemove = removeConditionById(
      withCond.conditions,
      withCond.conditionId,
    );
    expect(afterChildRemove[0]?.conditions).toHaveLength(0);

    const afterRootRemove = removeConditionById(afterChildRemove, roots[0]!.id);
    expect(afterRootRemove).toHaveLength(0);
  });
});
