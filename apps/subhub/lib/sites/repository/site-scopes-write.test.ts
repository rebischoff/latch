import { ConflictError, ValidationError, isConflictError } from "@latch/contracts";
import { describe, expect, it } from "vitest";

import {
  assertNoReferencedZoneDeletes,
  assertNoRootWithChildrenDeletes,
  flattenZoneTree,
} from "./site-scopes-write";

describe("flattenZoneTree", () => {
  it("flattens nested zones with 1-based sibling sort_order", () => {
    const flat = flattenZoneTree(
      [
        {
          name: "Floor 1",
          zones: [
            {
              name: "East wing",
              zones: [],
            },
          ],
        },
      ],
      "scope-1",
      0,
      new Set(),
    );

    expect(flat).toHaveLength(2);
    expect(flat[0]).toMatchObject({
      name: "Floor 1",
      parent_zone_id: "scope-1",
      sort_order: 1,
    });
    expect(flat[1]).toMatchObject({
      name: "East wing",
      parent_zone_id: flat[0]?.id,
      sort_order: 1,
    });
  });

  it("rejects blank zone names", () => {
    expect(() =>
      flattenZoneTree(
        [
          {
            name: "   ",
            zones: [],
          },
        ],
        "scope-1",
        0,
        new Set(),
      ),
    ).toThrow(ValidationError);

    try {
      flattenZoneTree([{ name: "", zones: [] }], "scope-1", 0, new Set());
    } catch (error) {
      expect(error).toMatchObject({
        details: {
          field: "scopes",
          code: "blank_zone_name",
        },
      });
    }
  });

  it("rejects zone trees deeper than max depth", () => {
    const deepChild: {
      name: string;
      zones: typeof deepChild[];
    } = {
      name: "leaf",
      zones: [],
    };

    let node = deepChild;
    for (let depth = 0; depth < 25; depth += 1) {
      node = {
        name: `level-${depth}`,
        zones: [node],
      };
    }

    expect(() => flattenZoneTree([node], null, 0, new Set())).toThrow(ValidationError);
  });
});

describe("assertNoReferencedZoneDeletes", () => {
  it("throws ConflictError when referenced zone is omitted", () => {
    const references = new Map<string, "estimate" | "job" | "asset">([
      ["zone-1", "estimate"],
    ]);

    expect(() =>
      assertNoReferencedZoneDeletes(["zone-1"], references, "scopes"),
    ).toThrow(ConflictError);

    try {
      assertNoReferencedZoneDeletes(["zone-1"], references, "scopes");
    } catch (error) {
      expect(isConflictError(error)).toBe(true);
      expect(error).toMatchObject({
        details: {
          field: "scopes",
          code: "referenced",
          blocker: "estimate",
          id: "zone-1",
        },
      });
    }
  });

  it("allows deleting unreferenced zones", () => {
    const references = new Map<string, "estimate" | "job" | "asset">();

    expect(() =>
      assertNoReferencedZoneDeletes(["zone-1"], references, "scopes"),
    ).not.toThrow();
  });
});

describe("assertNoRootWithChildrenDeletes", () => {
  it("blocks deleting a root that still has children", () => {
    expect(() =>
      assertNoRootWithChildrenDeletes(
        ["root-1"],
        [
          { id: "root-1", parent_zone_id: null, root_item_id: "item-1" },
          { id: "zone-1", parent_zone_id: "root-1", root_item_id: null },
        ],
      ),
    ).toThrow(ConflictError);

    try {
      assertNoRootWithChildrenDeletes(
        ["root-1"],
        [
          { id: "root-1", parent_zone_id: null, root_item_id: "item-1" },
          { id: "zone-1", parent_zone_id: "root-1", root_item_id: null },
        ],
      );
    } catch (error) {
      expect(isConflictError(error)).toBe(true);
      expect(error).toMatchObject({
        details: {
          field: "scopes",
          code: "has_children",
          id: "root-1",
        },
      });
    }
  });

  it("allows deleting an empty root", () => {
    expect(() =>
      assertNoRootWithChildrenDeletes(
        ["root-1"],
        [{ id: "root-1", parent_zone_id: null, root_item_id: "item-1" }],
      ),
    ).not.toThrow();
  });
});
