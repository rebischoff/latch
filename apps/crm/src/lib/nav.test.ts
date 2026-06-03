import { describe, expect, it } from "vitest";

import type { Principal } from "@latch/contracts";

import { resolveNavItems } from "./nav.js";

const principal = (...roles: string[]): Principal => ({ id: "user-1", roles });

describe("resolveNavItems", () => {
  it("field_tech: Jobs only", () => {
    const items = resolveNavItems(principal("field_tech"));
    expect(items.map((i) => i.href)).toEqual(["/jobs"]);
  });

  it("office_admin: Jobs + Customers", () => {
    const items = resolveNavItems(principal("office_admin"));
    expect(items.map((i) => i.href)).toEqual(["/jobs", "/customers"]);
  });

  it("does not expose Surface ids in nav DTO", () => {
    const items = resolveNavItems(principal("office_admin"));
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(["href", "key", "label"]);
      expect(JSON.stringify(item)).not.toMatch(/customer_detail|job_detail/);
    }
  });
});
