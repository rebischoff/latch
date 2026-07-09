import { describe, expect, it } from "vitest";

import { formatSpecNumber, fromCanonical, specValueToCanonical, specValueToDisplay, toCanonical } from "./spec-units";

const milliampere = {
  id: "a1000001-0001-4001-8001-000000000002",
  symbol: "mA",
  name: "Milliampere",
  dimension: "current",
  canonical_unit_id: "a1000001-0001-4001-8001-000000000001",
  to_canonical_factor: 0.001,
  sort_order: 2,
};

describe("spec-units", () => {
  it("converts authored values to and from canonical storage", () => {
    expect(toCanonical(500, milliampere)).toBe(0.5);
    expect(fromCanonical(0.5, milliampere)).toBe(500);
  });

  it("formats with decimal places and unit symbol", () => {
    expect(formatSpecNumber(0.5, milliampere, 0)).toBe("500 mA");
    expect(formatSpecNumber(3, { symbol: "ton", to_canonical_factor: 1 }, 1)).toBe("3.0 ton");
  });

  it("round-trips display values through helpers", () => {
    const unit = { to_canonical_factor: 1609.34, unit_symbol: "mi" };
    expect(specValueToDisplay(16093.4, unit)).toBeCloseTo(10);
    expect(specValueToCanonical(10, unit)).toBeCloseTo(16093.4);
  });
});
