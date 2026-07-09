import { describe, expect, it } from "vitest";

import { makeLine, type EstimateScopeFormRow } from "@/components/estimates/estimate-line-tree";
import {
  defaultBucketSelection,
  ensureBucketIncluded,
  filterLinesForSelection,
  parseSelectionFromTreeKey,
  selectionToTreeKey,
} from "@/components/estimates/estimate-line-selection";

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
        {
          id: "zone-a",
          name: "North wing",
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
};

describe("parseSelectionFromTreeKey", () => {
  it("parses scope and zone keys", () => {
    expect(parseSelectionFromTreeKey("scope:site-scope-1")).toEqual({
      siteScopeId: "site-scope-1",
      siteZoneId: null,
    });
    expect(parseSelectionFromTreeKey("zone:site-scope-1:zone-a")).toEqual({
      siteScopeId: "site-scope-1",
      siteZoneId: "zone-a",
    });
  });
});

describe("selectionToTreeKey", () => {
  it("round-trips scope and zone selections", () => {
    const scopeSelection = { siteScopeId: "site-scope-1", siteZoneId: null };
    expect(selectionToTreeKey(scopeSelection)).toBe("scope:site-scope-1");
    expect(parseSelectionFromTreeKey(selectionToTreeKey(scopeSelection))).toEqual(
      scopeSelection,
    );

    const zoneSelection = { siteScopeId: "site-scope-1", siteZoneId: "zone-a" };
    expect(selectionToTreeKey(zoneSelection)).toBe("zone:site-scope-1:zone-a");
    expect(parseSelectionFromTreeKey(selectionToTreeKey(zoneSelection))).toEqual(
      zoneSelection,
    );
  });
});

describe("defaultBucketSelection", () => {
  it("selects the first site scope", () => {
    expect(defaultBucketSelection(siteTree)).toEqual({
      siteScopeId: "site-scope-1",
      siteZoneId: null,
    });
  });
});

describe("filterLinesForSelection", () => {
  it("filters unzoned lines for scope selection and zoned lines for zone selection", () => {
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
      makeLine({ id: "line-1", estimate_scope_id: "est-scope-1", description: "Unzoned" }),
      makeLine({
        id: "line-2",
        estimate_scope_id: "est-scope-1",
        site_zone_id: "zone-a",
        description: "Zoned",
      }),
    ];

    expect(
      filterLinesForSelection(lines, scopes, {
        siteScopeId: "site-scope-1",
        siteZoneId: null,
      }).map((line) => line.id),
    ).toEqual(["line-1"]);

    expect(
      filterLinesForSelection(lines, scopes, {
        siteScopeId: "site-scope-1",
        siteZoneId: "zone-a",
      }).map((line) => line.id),
    ).toEqual(["line-2"]);
  });

  it("returns no lines when the bucket is not on the quote yet", () => {
    const lines = [
      makeLine({ id: "line-1", estimate_scope_id: "est-scope-1", description: "Unzoned" }),
    ];

    expect(
      filterLinesForSelection(lines, [], {
        siteScopeId: "site-scope-1",
        siteZoneId: null,
      }),
    ).toEqual([]);
  });
});

describe("ensureBucketIncluded", () => {
  it("implicitly includes scope and zone buckets", () => {
    const scopeResult = ensureBucketIncluded([], siteTree, {
      siteScopeId: "site-scope-1",
      siteZoneId: null,
    });

    expect(scopeResult?.binding).toEqual({ scopeIndex: 0 });
    expect(scopeResult?.scopes).toHaveLength(1);
    expect(scopeResult?.scopes[0]?.site_scope_id).toBe("site-scope-1");

    const zoneResult = ensureBucketIncluded([], siteTree, {
      siteScopeId: "site-scope-1",
      siteZoneId: "zone-a",
    });

    expect(zoneResult?.binding).toEqual({ scopeIndex: 0, zoneIndex: 0 });
    expect(zoneResult?.scopes[0]?.zones).toHaveLength(1);
    expect(zoneResult?.scopes[0]?.zones[0]?.site_zone_id).toBe("zone-a");
  });
});
