import { describe, expect, it } from "vitest";

import type { ItemTreeNode } from "./descriptors/item-list";
import {
  buildAncestorChain,
  flattenItemTreeCommercial,
  formatAddOnRateSummary,
  formatMarkupRateSummary,
  resolveEffectiveRateTypeId,
} from "./item-commercial-display";

const treeNode = (
  id: string,
  parent_id: string | null,
  overrides: Partial<ItemTreeNode> = {},
): ItemTreeNode => ({
  id,
  name: id,
  parent_id,
  sort_order: 1,
  is_root: parent_id === null,
  node_type: parent_id === null ? "scope" : "category",
  children: [],
  freight_rate_type_id: null,
  incidental_rate_type_id: null,
  markup_type_id: null,
  ...overrides,
});

describe("formatAddOnRateSummary", () => {
  it("formats percent and amount together", () => {
    expect(formatAddOnRateSummary(10, 300)).toBe("10% + $3.00");
  });

  it("formats percent only", () => {
    expect(formatAddOnRateSummary(10, 0)).toBe("10%");
  });

  it("formats amount only", () => {
    expect(formatAddOnRateSummary(0, 300)).toBe("$3.00");
  });

  it("returns null when both are zero", () => {
    expect(formatAddOnRateSummary(0, 0)).toBeNull();
  });
});

describe("formatMarkupRateSummary", () => {
  it("collapses matching material and labor markup", () => {
    expect(formatMarkupRateSummary(10, 10)).toBe("10%");
  });

  it("shows both sides when they differ", () => {
    expect(formatMarkupRateSummary(20, 10)).toBe("M 20% + L 10%");
  });
});

describe("resolveEffectiveRateTypeId", () => {
  const tree: ItemTreeNode[] = [
    treeNode("root", null, {
      freight_rate_type_id: "freight-root",
      children: [
        treeNode("child", "root", {
          children: [treeNode("leaf", "child")],
        }),
      ],
    }),
  ];

  const index = flattenItemTreeCommercial(tree);
  const leafChain = buildAncestorChain(index, "leaf", "child");

  it("uses self value when set", () => {
    expect(
      resolveEffectiveRateTypeId(index, leafChain, "freight", "freight-self"),
    ).toBe("freight-self");
  });

  it("walks ancestors when self is null", () => {
    expect(resolveEffectiveRateTypeId(index, leafChain, "freight", null)).toBe(
      "freight-root",
    );
  });

  it("starts from parent when item is not in the tree", () => {
    const createChain = buildAncestorChain(index, "new", "child");
    expect(resolveEffectiveRateTypeId(index, createChain, "freight", null)).toBe(
      "freight-root",
    );
  });
});
