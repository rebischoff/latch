import { describe, expect, it } from "vitest";

import {
  buildLineTree,
  makeCondition,
  makeLine,
  orderLineItemsForPatch,
} from "@/components/estimates/estimate-line-tree";

describe("buildLineTree", () => {
  it("nests child conditions and lines under root conditions", () => {
    const conditions = [
      makeCondition({
        id: "root-1",
        name: "Intrusion",
        root_item_id: "item-root",
        conditions: [makeCondition({ id: "cond-1", name: "Office" })],
      }),
    ];
    const lines = [
      makeLine({
        id: "root-line",
        estimate_condition_id: "root-1",
      }),
      makeLine({
        id: "cond-line",
        estimate_condition_id: "cond-1",
      }),
    ];

    const tree = buildLineTree(conditions, lines);
    expect(tree[0]?.key).toBe("condition:root-1");
    expect(tree[0]?.children?.some((n) => n.key === "condition:cond-1")).toBe(true);
    expect(tree[0]?.children?.some((n) => n.key === "line:root-line")).toBe(true);
  });
});

describe("orderLineItemsForPatch", () => {
  it("orders lines by condition forest walk", () => {
    const conditions = [
      makeCondition({
        id: "root-1",
        name: "Intrusion",
        root_item_id: "item-root",
        conditions: [makeCondition({ id: "cond-1", name: "Office" })],
      }),
    ];
    const lines = [
      makeLine({
        id: "cond-line",
        estimate_condition_id: "cond-1",
      }),
      makeLine({
        id: "root-line",
        estimate_condition_id: "root-1",
      }),
    ];

    const ordered = orderLineItemsForPatch(conditions, lines);
    expect(ordered.map((l) => l.id)).toEqual(["root-line", "cond-line"]);
  });
});
