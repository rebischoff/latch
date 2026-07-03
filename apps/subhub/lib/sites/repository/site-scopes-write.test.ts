import { ConflictError, ValidationError, isConflictError } from "@latch/contracts";
import { describe, expect, it } from "vitest";

import {
  assertNoReferencedZoneDeletes,
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
      null,
      0,
      new Set(),
    );

    expect(flat).toHaveLength(2);
    expect(flat[0]).toMatchObject({
      name: "Floor 1",
      site_scope_id: "scope-1",
      parent_zone_id: null,
      sort_order: 1,
    });
    expect(flat[1]).toMatchObject({
      name: "East wing",
      parent_zone_id: flat[0]?.id,
      sort_order: 1,
    });
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

    expect(() => flattenZoneTree([node], null, null, 0, new Set())).toThrow(ValidationError);
  });
});

describe("assertNoReferencedZoneDeletes", () => {
  it("throws ConflictError when referenced zone is omitted", () => {
    const references = new Map<string, "estimate" | "job" | "asset">([
      ["zone-1", "estimate"],
    ]);

    expect(() =>
      assertNoReferencedZoneDeletes(["zone-1"], references, "general_zones"),
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
      assertNoReferencedZoneDeletes(["zone-1"], references, "general_zones"),
    ).not.toThrow();
  });
});
