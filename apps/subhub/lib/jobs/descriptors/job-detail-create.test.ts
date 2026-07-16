import { describe, expect, it } from "vitest";

import { JobDetailCreateSchema } from "./job-detail";

describe("JobDetailCreateSchema", () => {
  it("accepts profile-only create body", () => {
    const parsed = JobDetailCreateSchema.safeParse({
      profile: { title: "Service call", site_id: "site-1" },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts optional conditions and line_items on create", () => {
    const parsed = JobDetailCreateSchema.safeParse({
      profile: { title: "Blank project", site_id: "site-1" },
      stakeholders: [{ party_id: "party-1", relation_id: "rel-1" }],
      conditions: [
        {
          id: "cond-1",
          name: "CCTV",
          site_zone_id: "zone-1",
          sort_order: 0,
          specs: [],
          conditions: [],
        },
      ],
      line_items: [
        {
          id: "line-1",
          line_role: "standalone",
          description: "Camera",
          job_condition_id: "cond-1",
          item_id: "item-1",
          quantity: 2,
          unit: "ea",
          unit_cost: 0,
          unit_price: 0,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown keys (strict)", () => {
    const parsed = JobDetailCreateSchema.safeParse({
      profile: { title: "X", site_id: "site-1" },
      cost_summary: {},
    });
    expect(parsed.success).toBe(false);
  });
});
