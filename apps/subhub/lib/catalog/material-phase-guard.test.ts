import { ConflictError, ValidationError, isConflictError } from "@latch/contracts";
import { describe, expect, it } from "vitest";

import {
  assertJobLineMaterialPhaseAllowed,
  assertMaterialPhaseAllowed,
  isMaterialUnlock,
} from "./material-phase-guard";

describe("assertMaterialPhaseAllowed", () => {
  it("allows null / empty", () => {
    expect(() => assertMaterialPhaseAllowed(null, ["a"])).not.toThrow();
    expect(() => assertMaterialPhaseAllowed(undefined, ["a"])).not.toThrow();
    expect(() => assertMaterialPhaseAllowed("", ["a"])).not.toThrow();
  });

  it("allows a phase in the resolved set", () => {
    expect(() =>
      assertMaterialPhaseAllowed("phase-install", ["phase-prewire", "phase-install"]),
    ).not.toThrow();
  });

  it("rejects a phase outside the resolved set", () => {
    expect(() =>
      assertMaterialPhaseAllowed("phase-other", ["phase-prewire"]),
    ).toThrow(ValidationError);

    try {
      assertMaterialPhaseAllowed("phase-other", ["phase-prewire"]);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toMatchObject({
        code: "invalid_material_phase",
        material_phase_id: "phase-other",
      });
    }
  });
});

describe("assertJobLineMaterialPhaseAllowed", () => {
  it("rejects a phase not seeded on the line", () => {
    expect(() =>
      assertJobLineMaterialPhaseAllowed("phase-x", ["phase-a"], "line-1"),
    ).toThrow(ValidationError);
  });

  it("allows a seeded scope_phase labor_phase_id", () => {
    expect(() =>
      assertJobLineMaterialPhaseAllowed("phase-a", ["phase-a", "phase-b"], "line-1"),
    ).not.toThrow();
  });
});

describe("isMaterialUnlock", () => {
  it("detects true → false only", () => {
    expect(isMaterialUnlock(true, false)).toBe(true);
    expect(isMaterialUnlock(true, true)).toBe(false);
    expect(isMaterialUnlock(false, false)).toBe(false);
    expect(isMaterialUnlock(false, true)).toBe(false);
  });
});

describe("part_on_purchase_order conflict shape", () => {
  it("uses structured ConflictError details", () => {
    const error = new ConflictError(
      "Cannot unlock material already on a purchase order",
      {
        field: "line_items",
        code: "part_on_purchase_order",
        job_line_id: "line-1",
      },
    );
    expect(isConflictError(error)).toBe(true);
    expect(error.details).toMatchObject({
      code: "part_on_purchase_order",
      job_line_id: "line-1",
    });
  });
});
