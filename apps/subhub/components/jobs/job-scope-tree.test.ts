import { describe, expect, it } from "vitest";

import {
  isComplexityAdjustedFromSold,
  jobLineToPatch,
  placesMismatchWorkingQty,
} from "@/components/jobs/job-scope-tree";
import { JobDetailPatchSchema } from "@/lib/jobs/descriptors/job-detail";

describe("isComplexityAdjustedFromSold (48 JC5)", () => {
  it("is quiet when baseline is null (manual / post-win)", () => {
    expect(isComplexityAdjustedFromSold(null, "cf-a")).toBe(false);
    expect(isComplexityAdjustedFromSold(undefined, "cf-a")).toBe(false);
    expect(isComplexityAdjustedFromSold("", "cf-a")).toBe(false);
  });

  it("is quiet when current effective matches at-win", () => {
    expect(isComplexityAdjustedFromSold("cf-a", "cf-a")).toBe(false);
  });

  it("flags when current effective differs from at-win", () => {
    expect(isComplexityAdjustedFromSold("cf-a", "cf-b")).toBe(true);
    expect(isComplexityAdjustedFromSold("cf-a", null)).toBe(true);
  });
});

describe("JobDetailPatchSchema (48 JC5 at-win)", () => {
  it("rejects client writes of complexity_factor_id_at_win", () => {
    const result = JobDetailPatchSchema.safeParse({
      conditions: [
        {
          name: "Root",
          sort_order: 1,
          complexity_factor_id: "cf-a",
          complexity_factor_id_at_win: "cf-old",
          specs: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts complexity_factor_id without at-win", () => {
    const result = JobDetailPatchSchema.safeParse({
      conditions: [
        {
          name: "Root",
          sort_order: 1,
          complexity_factor_id: "cf-a",
          specs: [],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("placesMismatchWorkingQty (JLI-6)", () => {
  it("flags qty > 0 with no allocations", () => {
    expect(placesMismatchWorkingQty(3, [])).toBe(true);
  });

  it("is quiet when qty is 0 and there are no allocations", () => {
    expect(placesMismatchWorkingQty(0, [])).toBe(false);
  });

  it("flags when allocation sum differs from working qty", () => {
    expect(
      placesMismatchWorkingQty(5, [
        { quantity: 2 },
        { quantity: 2 },
      ]),
    ).toBe(true);
  });

  it("is quiet when allocation sum matches working qty", () => {
    expect(
      placesMismatchWorkingQty(5, [
        { quantity: 2 },
        { quantity: 3 },
      ]),
    ).toBe(false);
  });
});

describe("jobLineToPatch (47 sold fields)", () => {
  it("omits sold_quantity and sold_* from the PATCH body", () => {
    const patch = jobLineToPatch({
      id: "line-1",
      job_condition_id: "cond-1",
      line_role: "standalone",
      line_kind: "product",
      parent_line_id: null,
      description: "Device",
      quantity: 4,
      sold_quantity: 3,
      qty_manual: true,
      unit: "ea",
      unit_cost: 10,
      unit_price: 20,
      unit_material: 5,
      unit_labor: 5,
      unit_freight: 0,
      unit_incidental: 0,
      unit_price_target: null,
      sold_unit_price: 20,
      sold_unit_cost: 8,
      sold_unit_material: 4,
      sold_unit_labor: 4,
      sold_unit_freight: 0,
      sold_unit_incidental: 0,
      allocations: [],
      sales_locked: false,
      material_locked: false,
      item_id: "item-1",
      item_name: "Device",
      part_id: "part-1",
      part_mpn: "MPN-1",
      vendor_part_id: null,
      source: "estimate",
      status: "active",
      estimate_line_id: "est-line-1",
    });

    expect(patch).not.toHaveProperty("sold_quantity");
    expect(patch).not.toHaveProperty("sold_unit_price");
    expect(patch).not.toHaveProperty("sold_unit_cost");
    expect(patch.quantity).toBe(4);
    expect(patch.part_id).toBe("part-1");
  });
});
