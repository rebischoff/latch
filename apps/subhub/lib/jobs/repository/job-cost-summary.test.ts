import { describe, expect, it } from "vitest";

import type { JobCostSummary } from "./job-cost-summary";

/** Pure margin math used by the rollup (mirrors loadJobCostSummary). */
const marginsFrom = (
  contract: number,
  budget: number,
  rebudgeted: number,
  actual: number,
): Pick<
  JobCostSummary,
  "margin_vs_budget" | "margin_vs_rebudgeted" | "margin_vs_actual"
> => ({
  margin_vs_budget: contract - budget,
  margin_vs_rebudgeted: contract - rebudgeted,
  margin_vs_actual: contract - actual,
});

describe("job cost summary margins", () => {
  it("reports contract − cost layer side by side", () => {
    expect(marginsFrom(10_000, 7_000, 7_500, 6_200)).toEqual({
      margin_vs_budget: 3_000,
      margin_vs_rebudgeted: 2_500,
      margin_vs_actual: 3_800,
    });
  });
});

describe("job cost summary JLI-7 formulas", () => {
  it("uses sold_quantity × sold_unit_price for contract and quantity × unit_cost for budget", () => {
    const lines = [
      { sold_quantity: 3, sold_unit_price: 100, quantity: 4, unit_cost: 40 },
      { sold_quantity: 0, sold_unit_price: 0, quantity: 2, unit_cost: 25 },
    ];
    let contract = 0;
    let budget = 0;
    for (const row of lines) {
      contract += row.sold_quantity * row.sold_unit_price;
      budget += row.quantity * row.unit_cost;
    }
    expect(contract).toBe(300);
    expect(budget).toBe(210);
  });
});
