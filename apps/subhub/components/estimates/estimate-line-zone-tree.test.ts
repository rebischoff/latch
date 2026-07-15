import { describe, expect, it } from "vitest";

import type { EstimateSiteTreeFormRow } from "@/components/estimates/estimate-line-tree";
import {
  allocationsFromCheckedLeaves,
  applyParentQty,
  cascadeCheck,
  checkedAndHalfKeys,
  checkedLeafIdsFromAllocations,
  leafIdsInSubtree,
  normalizeExclusiveLine,
  quantityFromTreeMode,
  sumCheckedLeafQty,
  zoneSubtreeForRoot,
} from "@/components/estimates/estimate-line-zone-tree";

const siteTree: EstimateSiteTreeFormRow = {
  scopes: [
    {
      id: "bldg-a",
      name: "Bldg A",
      root_item_id: "fa",
      zones: [
        {
          id: "floor-1",
          name: "Floor 1",
          zones: [
            { id: "door-1", name: "Door 1" },
            { id: "door-2", name: "Door 2" },
          ],
        },
        {
          id: "floor-2",
          name: "Floor 2",
          zones: [{ id: "door-3", name: "Door 3" }],
        },
      ],
    },
    {
      id: "bldg-b",
      name: "Bldg B",
      root_item_id: "fa",
      zones: [{ id: "b-door", name: "Door B" }],
    },
  ],
};

describe("zoneSubtreeForRoot", () => {
  it("returns only the condition-root subtree", () => {
    const tree = zoneSubtreeForRoot(siteTree, "bldg-a");
    expect(tree?.key).toBe("bldg-a");
    expect(tree?.children?.map((c) => c.key)).toEqual(["floor-1", "floor-2"]);
    expect(zoneSubtreeForRoot(siteTree, "bldg-b")?.key).toBe("bldg-b");
    expect(zoneSubtreeForRoot(siteTree, "missing")).toBeNull();
  });
});

describe("leafIdsInSubtree", () => {
  it("returns only leaves under the root", () => {
    const tree = zoneSubtreeForRoot(siteTree, "bldg-a");
    expect(leafIdsInSubtree(tree)).toEqual(["door-1", "door-2", "door-3"]);
  });

  it("treats a childless root as a leaf", () => {
    const lonely: EstimateSiteTreeFormRow = {
      scopes: [{ id: "solo", name: "Solo", root_item_id: "x", zones: [] }],
    };
    expect(leafIdsInSubtree(zoneSubtreeForRoot(lonely, "solo"))).toEqual(["solo"]);
  });
});

describe("cascadeCheck", () => {
  it("checks all descendant leaves when parent is checked", () => {
    const tree = zoneSubtreeForRoot(siteTree, "bldg-a");
    expect(cascadeCheck("floor-1", true, tree, [])).toEqual(["door-1", "door-2"]);
    expect(cascadeCheck("bldg-a", true, tree, [])).toEqual([
      "door-1",
      "door-2",
      "door-3",
    ]);
  });

  it("unchecks descendant leaves when parent is unchecked", () => {
    const tree = zoneSubtreeForRoot(siteTree, "bldg-a");
    const all = cascadeCheck("bldg-a", true, tree, []);
    expect(cascadeCheck("floor-1", false, tree, all)).toEqual(["door-3"]);
  });
});

describe("checkedAndHalfKeys", () => {
  it("marks parent half-checked when some leaves are selected", () => {
    const tree = zoneSubtreeForRoot(siteTree, "bldg-a");
    const { checked, halfChecked } = checkedAndHalfKeys(tree, ["door-1"]);
    expect(checked).toContain("door-1");
    expect(checked).not.toContain("floor-1");
    expect(halfChecked).toContain("floor-1");
    expect(halfChecked).toContain("bldg-a");
  });

  it("marks parent fully checked when all descendant leaves are selected", () => {
    const tree = zoneSubtreeForRoot(siteTree, "bldg-a");
    const { checked, halfChecked } = checkedAndHalfKeys(tree, [
      "door-1",
      "door-2",
    ]);
    expect(checked).toContain("floor-1");
    expect(halfChecked).not.toContain("floor-1");
    expect(halfChecked).toContain("bldg-a");
  });
});

describe("applyParentQty + sum", () => {
  it("overwrites every listed leaf qty and sums for line qty", () => {
    const qtyByLeaf = { "door-1": 1, "door-2": 2, "door-3": 1 };
    const next = applyParentQty(["door-1", "door-2"], 3, qtyByLeaf);
    expect(next).toEqual({ "door-1": 3, "door-2": 3, "door-3": 1 });
    expect(sumCheckedLeafQty(["door-1", "door-2"], next)).toBe(6);
    expect(quantityFromTreeMode(6)).toBe(6);
    expect(quantityFromTreeMode(0)).toBe(1);
  });
});

describe("allocationsFromCheckedLeaves", () => {
  it("builds leaf-only allocation rows with default qty 1", () => {
    expect(
      allocationsFromCheckedLeaves(["door-1", "door-2"], { "door-1": 2 }, {
        "door-1": "Door 1",
        "door-2": "Door 2",
      }),
    ).toEqual([
      { site_zone_id: "door-1", quantity: 2, site_zone_name: "Door 1" },
      { site_zone_id: "door-2", quantity: 1, site_zone_name: "Door 2" },
    ]);
  });
});

describe("checkedLeafIdsFromAllocations", () => {
  it("intersects with current leaf set (drops non-leaves)", () => {
    expect(
      checkedLeafIdsFromAllocations(
        [
          { site_zone_id: "door-1", quantity: 1 },
          { site_zone_id: "floor-1", quantity: 2 },
        ],
        ["door-1", "door-2", "door-3"],
      ),
    ).toEqual(["door-1"]);
  });
});

describe("normalizeExclusiveLine", () => {
  it("clears allocations when qty_manual (Z8 prefer qty)", () => {
    const line = normalizeExclusiveLine(
      {
        qty_manual: true,
        quantity: 50,
        allocations: [{ site_zone_id: "door-1", quantity: 1 }],
      },
      ["door-1", "door-2"],
    );
    expect(line.allocations).toEqual([]);
    expect(line.quantity).toBe(50);
  });

  it("drops non-leaf allocation ids", () => {
    const line = normalizeExclusiveLine(
      {
        qty_manual: false,
        quantity: 3,
        allocations: [
          { site_zone_id: "door-1", quantity: 1 },
          { site_zone_id: "floor-1", quantity: 2 },
        ],
      },
      ["door-1", "door-2", "door-3"],
    );
    expect(line.allocations).toEqual([{ site_zone_id: "door-1", quantity: 1 }]);
  });
});
