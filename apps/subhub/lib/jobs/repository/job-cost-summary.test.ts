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
