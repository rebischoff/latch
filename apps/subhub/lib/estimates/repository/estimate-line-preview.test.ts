import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { previewEstimateLines } from "./estimate-line-preview";
import { recalcProductLine } from "./estimate-line-recalc";

vi.mock("./estimate-line-recalc", () => ({
  recalcProductLine: vi.fn(async (_client, line) => ({
    ...line,
    part_id: line.part_id ?? "resolved-part",
    vendor_part_id: "vp-1",
    unit_material: 100,
    unit_freight: 10,
    unit_incidental: 2.5,
    unit_labor: 50,
    unit_cost: 162.5,
    unit_price_target: 200,
    unit_price: line.sales_locked ? line.unit_price : 200,
  })),
}));

vi.mock("./estimate-commercial", () => ({
  loadCommercialCatalog: vi.fn(async () => ({})),
  loadComplexityContext: vi.fn(async () => ({ condition_factor_percent: 100 })),
  loadConditionLaborPhases: vi.fn(async () => null),
}));

vi.mock("./estimate-bucket-specs", () => ({
  loadConditionAncestorIds: vi.fn(async () => ["cond-1"]),
  loadConditionBucketSpecs: vi.fn(async () => []),
  loadLineBucketSpecs: vi.fn(async () => []),
  loadMergedBucketWithDraft: vi.fn(async () => new Map()),
  mergeBucketSpecs: vi.fn(() => new Map()),
}));

const makeClient = (status = "draft"): PoolClient =>
  ({
    query: vi.fn(async (sql: string) => {
      if (sql.includes("SELECT status FROM estimate")) {
        return { rows: [{ status }] };
      }
      if (sql.includes("FROM estimate_condition WHERE id")) {
        return { rows: [{ id: "cond-1" }] };
      }
      return { rows: [] };
    }),
  }) as unknown as PoolClient;

describe("previewEstimateLines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parallel preview results without mutating lock flags", async () => {
    const result = await previewEstimateLines(makeClient("draft"), "est-1", {
      condition_id: "cond-1",
      lines: [
        {
          id: "line-1",
          item_id: "item-1",
          part_id: null,
          sales_locked: true,
          material_locked: false,
          unit_price: 999,
        },
        {
          id: "line-2",
          item_id: "item-2",
          part_id: "part-2",
          sales_locked: false,
          material_locked: true,
          unit_price: 10,
        },
      ],
    });

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toMatchObject({
      id: "line-1",
      unit_price: 999,
      unit_price_target: 200,
    });
    expect(result.lines[1]).toMatchObject({
      id: "line-2",
      unit_price: 200,
    });
    expect(result.lines[0]).not.toHaveProperty("sales_locked");
    expect(recalcProductLine).toHaveBeenCalledTimes(2);
  });

  it("rejects non-draft estimates", async () => {
    await expect(
      previewEstimateLines(makeClient("submitted"), "est-1", {
        condition_id: "cond-1",
        lines: [{ id: "line-1", item_id: "item-1" }],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("allows create-mode preview without persisted estimate", async () => {
    const result = await previewEstimateLines(makeClient("submitted"), "new", {
      condition_id: "client-cond-1",
      condition_draft: {
        labor_phases_explicit: true,
        included_labor_phases: ["phase-1"],
        labor_only: false,
        specs: [],
      },
      lines: [{ id: "line-1", item_id: "item-1" }],
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({
      id: "line-1",
      unit_material: 100,
      unit_price: 200,
    });
    expect(recalcProductLine).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ is_new: true, item_id: "item-1" }),
      expect.anything(),
      expect.objectContaining({ laborOnly: false }),
    );
  });
});
