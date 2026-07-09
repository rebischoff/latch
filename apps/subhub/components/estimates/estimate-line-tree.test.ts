import { describe, expect, it } from "vitest";

import {
  buildLineTree,
  makeLine,
  orderLineItemsForPatch,
  type EstimateScopeFormRow,
} from "@/components/estimates/estimate-line-tree";

const baseScope = (overrides: Partial<EstimateScopeFormRow> = {}): EstimateScopeFormRow => ({
  id: "est-scope-1",
  site_scope_id: "site-scope-1",
  root_item_id: "root-1",
  root_item_name: "HVAC",
  site_scope_name: "Level 1",
  sort_order: 1,
  complexity_factor_id: null,
  included_labor_phases: [],
  specs: [],
  zones: [],
  ...overrides,
});

describe("makeLine", () => {
  it("always creates standalone lines without parent links", () => {
    const line = makeLine({
      line_role: "kit_header",
      parent_line_id: "parent-1",
      description: "Kit",
    });

    expect(line.line_role).toBe("standalone");
    expect(line.parent_line_id).toBeNull();
    expect(line.description).toBe("Kit");
  });
});

describe("buildLineTree", () => {
  it("ignores kit rows and only shows standalone lines", () => {
    const scopes = [
      baseScope({
        zones: [
          {
            site_zone_id: "zone-a",
            sort_order: 1,
            complexity_factor_id: null,
            included_labor_phases: [],
            specs: [],
          },
        ],
      }),
    ];

    const lines = [
      makeLine({ id: "line-1", estimate_scope_id: "est-scope-1", description: "Standalone" }),
      {
        ...makeLine({
          id: "kit-header",
          estimate_scope_id: "est-scope-1",
          description: "Kit header",
        }),
        line_role: "kit_header" as const,
      },
      {
        ...makeLine({
          id: "kit-component",
          estimate_scope_id: "est-scope-1",
          description: "Kit component",
        }),
        line_role: "kit_component" as const,
        parent_line_id: "kit-header",
      },
      makeLine({
        id: "line-2",
        estimate_scope_id: "est-scope-1",
        site_zone_id: "zone-a",
        description: "Zoned line",
      }),
    ];

    const tree = buildLineTree(scopes, lines, {
      scopes: [
        {
          id: "site-scope-1",
          name: "Level 1",
          root_item_id: "root-1",
          zones: [{ id: "zone-a", name: "North wing" }],
        },
      ],
    });

    const scopeNode = tree[0];
    expect(scopeNode?.children).toHaveLength(2);
    expect(scopeNode?.children?.[0]?.rowKind).toBe("zone");
    expect(scopeNode?.children?.[0]?.children).toHaveLength(1);
    expect(scopeNode?.children?.[1]?.rowKind).toBe("line");
    expect(scopeNode?.children?.[1]?.lineId).toBe("line-1");
  });
});

describe("orderLineItemsForPatch", () => {
  it("orders unzoned lines before zoned lines within each scope", () => {
    const scopes = [
      baseScope({
        zones: [
          {
            site_zone_id: "zone-a",
            sort_order: 1,
            complexity_factor_id: null,
            included_labor_phases: [],
            specs: [],
          },
        ],
      }),
    ];

    const lines = [
      makeLine({ id: "zoned", estimate_scope_id: "est-scope-1", site_zone_id: "zone-a" }),
      makeLine({ id: "unzoned", estimate_scope_id: "est-scope-1", site_zone_id: null }),
    ];

    const ordered = orderLineItemsForPatch(scopes, lines);
    expect(ordered.map((line) => line.id)).toEqual(["unzoned", "zoned"]);
  });
});
