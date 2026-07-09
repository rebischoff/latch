import { describe, expect, it } from "vitest";

import type { EstimateScopeFormRow } from "@/components/estimates/estimate-line-tree";
import {
  addScopeToQuote,
  addZoneToQuote,
  flattenSiteZones,
  removeScopeFromQuote,
  removeZoneFromQuote,
  scopeReferencedByLines,
  scopesNotOnQuote,
  zonesNotOnQuote,
  zoneReferencedByLines,
} from "@/components/estimates/estimate-scope-tree";

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

const siteTree = {
  scopes: [
    {
      id: "site-scope-1",
      name: "Level 1",
      root_item_id: "root-1",
      zones: [
        { id: "zone-a", name: "North wing" },
        {
          id: "zone-b",
          name: "South wing",
          zones: [{ id: "zone-b1", name: "Mechanical" }],
        },
      ],
    },
    {
      id: "site-scope-2",
      name: "Level 2",
      root_item_id: "root-2",
      zones: [],
    },
  ],
  spec_templates: {
    "root-1": [
      {
        spec_def_id: "def-1",
        value_number: null,
        value_boolean: null,
        spec_option_id: null,
      },
    ],
  },
};

describe("flattenSiteZones", () => {
  it("flattens nested site zones with path labels", () => {
    const flat = flattenSiteZones(siteTree.scopes[0]?.zones);
    expect(flat).toEqual([
      { id: "zone-a", label: "North wing" },
      { id: "zone-b", label: "South wing" },
      { id: "zone-b1", label: "South wing / Mechanical" },
    ]);
  });
});

describe("scopesNotOnQuote", () => {
  it("returns site scopes not yet included on the quote", () => {
    const onQuote = [baseScope()];
    const available = scopesNotOnQuote(siteTree, onQuote);
    expect(available.map((scope) => scope.id)).toEqual(["site-scope-2"]);
  });
});

describe("zonesNotOnQuote", () => {
  it("returns zones for a scope not yet included on the quote", () => {
    const scope = baseScope();
    const available = zonesNotOnQuote("site-scope-1", siteTree, scope);
    expect(available.map((zone) => zone.id)).toEqual(["zone-a", "zone-b", "zone-b1"]);
  });

  it("excludes zones already on the quote scope", () => {
    const scope = baseScope({
      zones: [
        {
          site_zone_id: "zone-a",
          sort_order: 1,
          complexity_factor_id: null,
          included_labor_phases: [],
          specs: [],
        },
      ],
    });
    const available = zonesNotOnQuote("site-scope-1", siteTree, scope);
    expect(available.map((zone) => zone.id)).toEqual(["zone-b", "zone-b1"]);
  });
});

describe("addScopeToQuote", () => {
  it("appends a scope and seeds spec templates", () => {
    const siteScope = siteTree.scopes[0]!;
    const next = addScopeToQuote([], siteScope, siteTree.spec_templates);
    expect(next).toHaveLength(1);
    expect(next[0]?.site_scope_id).toBe("site-scope-1");
    expect(next[0]?.specs).toHaveLength(1);
  });
});

describe("addZoneToQuote", () => {
  it("auto-includes the parent scope when adding a zone", () => {
    const next = addZoneToQuote([], "site-scope-1", "zone-a", siteTree);
    expect(next).toHaveLength(1);
    expect(next[0]?.zones).toHaveLength(1);
    expect(next[0]?.zones[0]?.site_zone_id).toBe("zone-a");
    expect(next[0]?.zones[0]?.specs).toHaveLength(1);
  });
});

describe("reference guards", () => {
  it("blocks scope removal when lines reference the scope bucket", () => {
    const scopes = [baseScope()];
    const lines = [{ estimate_scope_id: "est-scope-1" }];
    expect(scopeReferencedByLines(scopes, lines, "site-scope-1")).toBe(true);
    expect(removeScopeFromQuote(scopes, lines, "est-scope-1")).toBeNull();
  });

  it("blocks zone removal when lines reference the zone", () => {
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
    const lines = [{ site_zone_id: "zone-a" }];
    expect(zoneReferencedByLines(lines, "zone-a")).toBe(true);
    expect(removeZoneFromQuote(scopes, lines, 0, "zone-a")).toBeNull();
  });

  it("allows scope removal when no lines reference it", () => {
    const scopes = [baseScope()];
    const next = removeScopeFromQuote(scopes, [], "est-scope-1");
    expect(next).toEqual([]);
  });
});
