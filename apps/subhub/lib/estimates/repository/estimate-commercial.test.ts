import { describe, expect, it } from "vitest";

import {
  computeAddOnUnit,
  computeUnitPriceTarget,
  resolveComplexityPercent,
  resolveRate,
  type CommercialCatalog,
  type CostAddOnProfile,
  type ItemCommercialRow,
  type ItemLaborPhaseRow,
} from "./estimate-commercial";

const buildCatalog = (input: {
  items: ItemCommercialRow[];
  labor?: ItemLaborPhaseRow[];
  addOns?: CostAddOnProfile[];
  markups?: Array<{
    id: string;
    labor_markup_percent: number;
    material_markup_percent: number;
  }>;
}): CommercialCatalog => {
  const itemsById = new Map(input.items.map((row) => [row.id, row]));

  const laborByItem = new Map<string, ItemLaborPhaseRow[]>();
  for (const row of input.labor ?? []) {
    const rows = laborByItem.get(row.item_id) ?? [];
    rows.push(row);
    laborByItem.set(row.item_id, rows);
  }

  return {
    itemsById,
    laborByItem,
    addOnById: new Map((input.addOns ?? []).map((row) => [row.id, row])),
    markupById: new Map((input.markups ?? []).map((row) => [row.id, row])),
  };
};

const item = (
  id: string,
  parent_id: string | null,
  overrides: Partial<ItemCommercialRow> = {},
): ItemCommercialRow => ({
  id,
  parent_id,
  fallback_unit_cost: 0,
  freight_rate_type_id: null,
  incidental_rate_type_id: null,
  markup_type_id: null,
  ...overrides,
});

describe("resolveRate", () => {
  it("uses self labor on leaf", () => {
    const catalog = buildCatalog({
      items: [item("leaf", "root")],
      labor: [
        {
          item_id: "leaf",
          labor_phase_id: "p1",
          labor_rate_type_id: "r1",
          hours_per_unit: 2,
          rate_cents: 5000,
        },
      ],
    });

    expect(resolveRate(catalog, "leaf", "labor")).toBe(100);
  });

  it("inherits freight from ancestor when leaf has none", () => {
    const catalog = buildCatalog({
      items: [item("root", null, { freight_rate_type_id: "f1" }), item("leaf", "root")],
      addOns: [{ id: "f1", percent: 10, amount_cents: 0 }],
    });

    const profile = resolveRate(catalog, "leaf", "freight") as CostAddOnProfile;
    expect(profile.percent).toBe(10);
  });

  it("inherits labor from ancestor when leaf has none", () => {
    const catalog = buildCatalog({
      items: [
        item("root", null),
        item("branch", "root"),
        item("leaf", "branch"),
      ],
      labor: [
        {
          item_id: "branch",
          labor_phase_id: "p1",
          labor_rate_type_id: "r1",
          hours_per_unit: 2,
          rate_cents: 5000,
        },
      ],
    });

    expect(resolveRate(catalog, "leaf", "labor")).toBe(100);
  });

  it("returns neutral when no profile exists", () => {
    const catalog = buildCatalog({
      items: [item("root", null), item("leaf", "root")],
    });

    expect(resolveRate(catalog, "leaf", "markup")).toBeNull();
  });
});

describe("computeAddOnUnit", () => {
  it("adds percent and fixed amount", () => {
    expect(
      computeAddOnUnit({ id: "f1", percent: 10, amount_cents: 250 }, 100),
    ).toBe(12.5);
  });
});

describe("computeUnitPriceTarget", () => {
  it("applies split markup", () => {
    expect(
      computeUnitPriceTarget(100, 50, 10, 5, {
        id: "m1",
        material_markup_percent: 20,
        labor_markup_percent: 10,
      }),
    ).toBeCloseTo(193);
  });
});

describe("resolveComplexityPercent", () => {
  it("prefers zone over scope", () => {
    expect(
      resolveComplexityPercent({
        scope_factor_percent: 110,
        zone_factor_percent: 125,
      }),
    ).toBe(125);
  });

  it("defaults to 100", () => {
    expect(
      resolveComplexityPercent({
        scope_factor_percent: null,
        zone_factor_percent: null,
      }),
    ).toBe(100);
  });
});
