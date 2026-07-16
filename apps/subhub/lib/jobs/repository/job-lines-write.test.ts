import { describe, expect, it } from "vitest";

import { soldLineBlocksDelete } from "./job-lines-write";

describe("soldLineBlocksDelete (Scope-E1 / 47 JLI)", () => {
  it("blocks deleting a line with a positive sold unit price", () => {
    expect(
      soldLineBlocksDelete({ sold_unit_price: 120, sold_quantity: 1 }),
    ).toBe(true);
  });

  it("blocks deleting a sold line even at sold_quantity 0 (sold price alone counts)", () => {
    expect(
      soldLineBlocksDelete({ sold_unit_price: 50, sold_quantity: 0 }),
    ).toBe(true);
  });

  it("allows deleting a new engineering line with a $0 sold snapshot", () => {
    expect(
      soldLineBlocksDelete({ sold_unit_price: 0, sold_quantity: 5 }),
    ).toBe(false);
  });

  it("allows deleting when both sold price and sold_quantity are zero", () => {
    expect(
      soldLineBlocksDelete({ sold_unit_price: 0, sold_quantity: 0 }),
    ).toBe(false);
  });
});
