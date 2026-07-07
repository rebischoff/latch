import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CommercialCatalog } from "./estimate-commercial";
import { resolveLineMaterial } from "./estimate-part-resolver";
import { recalcLineItems, recalcProductLine, type RecalcLineInput } from "./estimate-line-recalc";

const { buildCatalog } = vi.hoisted(() => {
  const buildCatalog = (): CommercialCatalog => ({
    itemsById: new Map([
      [
        "item-leaf",
        {
          id: "item-leaf",
          parent_id: "item-root",
          fallback_unit_cost: 0,
          freight_rate_type_id: "freight-1",
          incidental_rate_type_id: "incidental-1",
          markup_type_id: "markup-1",
        },
      ],
      [
        "item-root",
        {
          id: "item-root",
          parent_id: null,
          fallback_unit_cost: 0,
          freight_rate_type_id: null,
          incidental_rate_type_id: null,
          markup_type_id: null,
        },
      ],
    ]),
    laborByItem: new Map([
      [
        "item-leaf",
        [
          {
            item_id: "item-leaf",
            labor_phase_id: "phase-1",
            labor_rate_type_id: "rate-1",
            hours_per_unit: 2,
            rate_cents: 5000,
          },
        ],
      ],
    ]),
    addOnById: new Map([
      ["freight-1", { id: "freight-1", percent: 10, amount_cents: 0 }],
      ["incidental-1", { id: "incidental-1", percent: 0, amount_cents: 250 }],
    ]),
    markupById: new Map([
      ["markup-1", { id: "markup-1", material_markup_percent: 20, labor_markup_percent: 10 }],
    ]),
  });

  return { buildCatalog };
});

vi.mock("./estimate-bucket-specs", () => ({
  loadMergedBucketForLine: vi.fn(async () => new Map()),
}));

vi.mock("./estimate-part-resolver", () => ({
  resolveLineMaterial: vi.fn(async () => ({
    filtered_part_count: 0,
    lock: "none" as const,
    part_id: null,
    part_match_alert: null,
    unit_material: 100,
    vendor_part_id: null,
  })),
}));

vi.mock("./estimate-commercial", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./estimate-commercial")>();
  return {
    ...actual,
    loadCommercialCatalog: vi.fn(async () => buildCatalog()),
    loadComplexityContext: vi.fn(async () => ({
      scope_factor_percent: null,
      zone_factor_percent: 125,
    })),
  };
});

const makeClient = (status: string | null = "draft"): PoolClient =>
  ({
    query: vi.fn(async (sql: string) => {
      if (sql.includes("FROM estimate e")) {
        return { rows: status ? [{ status }] : [] };
      }
      return { rows: [] };
    }),
  }) as unknown as PoolClient;

const baseLine = (): RecalcLineInput => ({
  id: "line-1",
  line_role: "standalone",
  description: "Smoke detector",
  quantity: 1,
  unit: "ea",
  unit_cost: 0,
  unit_price: 0,
  estimate_scope_id: "scope-1",
  site_zone_id: null,
  item_id: "item-leaf",
  part_id: null,
  lock: "none",
});

describe("recalcProductLine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("populates full commercial snapshots when lock is none", async () => {
    const result = await recalcProductLine(
      makeClient("draft"),
      { ...baseLine(), is_new: true },
      buildCatalog(),
    );

    expect(result.unit_material).toBe(100);
    expect(result.unit_freight).toBe(10);
    expect(result.unit_incidental).toBe(2.5);
    expect(result.unit_labor).toBe(125);
    expect(result.unit_cost).toBe(237.5);
    expect(result.unit_price_target).toBeCloseTo(272.5);
    expect(result.unit_price).toBeCloseTo(272.5);
  });

  it("freezes unit_price when lock is sell but updates cost snapshots", async () => {
    const result = await recalcProductLine(
      makeClient("draft"),
      { ...baseLine(), lock: "sell", unit_price: 999, is_new: false },
      buildCatalog(),
    );

    expect(result.unit_price).toBe(999);
    expect(result.unit_price_target).toBeCloseTo(272.5);
    expect(result.unit_labor).toBe(125);
    expect(result.unit_freight).toBe(10);
  });

  it("skips recalc entirely when lock is line", async () => {
    const frozen = {
      ...baseLine(),
      lock: "line" as const,
      unit_material: 50,
      unit_labor: 25,
      unit_freight: 5,
      unit_incidental: 1,
      unit_cost: 81,
      unit_price_target: 90,
      unit_price: 95,
    };

    const result = await recalcProductLine(makeClient("draft"), frozen, buildCatalog());

    expect(result.unit_material).toBe(50);
    expect(result.unit_labor).toBe(25);
    expect(result.unit_freight).toBe(5);
    expect(result.unit_incidental).toBe(1);
    expect(result.unit_cost).toBe(81);
    expect(result.unit_price_target).toBe(90);
    expect(result.unit_price).toBe(95);
  });

  it("skips recalc when estimate status is not draft", async () => {
    const frozen = {
      ...baseLine(),
      unit_material: 40,
      unit_labor: 10,
      unit_freight: 2,
      unit_incidental: 1,
      unit_cost: 53,
      unit_price_target: 60,
      unit_price: 65,
    };

    const result = await recalcProductLine(makeClient("sent"), frozen, buildCatalog());

    expect(result.unit_material).toBe(40);
    expect(result.unit_labor).toBe(10);
    expect(result.unit_price).toBe(65);
  });
});

describe("recalcLineItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveLineMaterial).mockResolvedValue({
      filtered_part_count: 0,
      lock: "none",
      part_id: null,
      part_match_alert: null,
      unit_material: 100,
      vendor_part_id: null,
    });
  });

  it("sets unit_price to target for new lines and preserves existing sell lock", async () => {
    const client = makeClient("draft");

    const lines: RecalcLineInput[] = [
      { ...baseLine(), id: "new-line", lock: "none" },
      { ...baseLine(), id: "existing-line", lock: "sell", unit_price: 888 },
    ];

    const results = await recalcLineItems(client, lines, new Set(["existing-line"]));

    const newLine = results.find((row) => row.id === "new-line");
    const existingLine = results.find((row) => row.id === "existing-line");

    expect(newLine?.unit_price).toBeCloseTo(newLine?.unit_price_target ?? 0);
    expect(existingLine?.unit_price).toBe(888);
    expect(existingLine?.unit_price_target).toBeCloseTo(272.5);
  });
});
