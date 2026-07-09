import { describe, expect, it } from "vitest";

import { deriveLaborPhaseMode } from "./item-labor-phase-display";

describe("deriveLaborPhaseMode", () => {
  it("returns override when own rows exist", () => {
    expect(
      deriveLaborPhaseMode([{ labor_phase_id: "p1" }], [{ labor_phase_id: "p2" }]),
    ).toBe("override");
  });

  it("returns inherited when only ancestor rows exist", () => {
    expect(deriveLaborPhaseMode([], [{ labor_phase_id: "p1" }])).toBe("inherited");
  });

  it("returns empty when neither exist", () => {
    expect(deriveLaborPhaseMode([], [])).toBe("empty");
  });
});
