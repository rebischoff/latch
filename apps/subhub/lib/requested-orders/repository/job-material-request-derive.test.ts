import { describe, expect, it } from "vitest";

import { computeDerivedOpenDemand } from "./job-material-request-derive";

describe("computeDerivedOpenDemand (task 63 / RP1)", () => {
  const scopePhase = {
    id: "sp-install",
    labor_phase_id: "lp-install",
    sequence: 1,
  };

  const baseLine = {
    id: "jl-1",
    item_id: "item-1",
    material_locked: true,
    material_phase_id: "lp-install",
    part_id: "part-1",
    quantity: 10,
    unit: "ea",
    description: "Camera",
    ancestryMaterialPhaseIds: ["lp-install"],
    scopePhases: [scopePhase],
    allocations: [{ site_zone_id: "zone-a", quantity: 6 }],
  };

  it("includes locked BOM × Ordered zone (and General remainder)", () => {
    const derived = computeDerivedOpenDemand({
      parts: [
        {
          id: "jlp-1",
          job_line_id: "jl-1",
          part_id: "part-1",
          description: "Camera",
          quantity: 10,
          unit: "ea",
        },
      ],
      lines: new Map([["jl-1", baseLine]]),
      requestedCells: new Set([
        "sp-install:zone-a",
        "sp-install:general",
      ]),
      poCoverageByPart: new Map(),
    });

    expect(derived).toHaveLength(2);
    const zoneIds = derived.map((r) => r.site_zone_id);
    expect(zoneIds).toContain("zone-a");
    expect(zoneIds).toContain(null);
    const zoneA = derived.find((r) => r.site_zone_id === "zone-a");
    const general = derived.find((r) => r.site_zone_id === null);
    expect(zoneA?.quantity).toBe(6);
    expect(general?.quantity).toBe(4);
  });

  it("excludes unlocked lines (not in lines map)", () => {
    const derived = computeDerivedOpenDemand({
      parts: [
        {
          id: "jlp-1",
          job_line_id: "jl-1",
          part_id: "part-1",
          description: "Camera",
          quantity: 10,
          unit: "ea",
        },
      ],
      lines: new Map(),
      requestedCells: new Set(["sp-install:zone-a", "sp-install:general"]),
      poCoverageByPart: new Map(),
    });
    expect(derived).toEqual([]);
  });

  it("excludes zones that are not Ordered", () => {
    const derived = computeDerivedOpenDemand({
      parts: [
        {
          id: "jlp-1",
          job_line_id: "jl-1",
          part_id: "part-1",
          description: "Camera",
          quantity: 10,
          unit: "ea",
        },
      ],
      lines: new Map([["jl-1", baseLine]]),
      requestedCells: new Set(["sp-install:general"]),
      poCoverageByPart: new Map(),
    });
    expect(derived).toHaveLength(1);
    expect(derived[0]?.site_zone_id).toBeNull();
    expect(derived[0]?.quantity).toBe(4);
  });

  it("caps zone qty by remaining after PO coverage (RP3)", () => {
    const derived = computeDerivedOpenDemand({
      parts: [
        {
          id: "jlp-1",
          job_line_id: "jl-1",
          part_id: "part-1",
          description: "Camera",
          quantity: 10,
          unit: "ea",
        },
      ],
      lines: new Map([["jl-1", baseLine]]),
      requestedCells: new Set([
        "sp-install:zone-a",
        "sp-install:general",
      ]),
      poCoverageByPart: new Map([["jlp-1", 8]]),
    });
    const total = derived.reduce((sum, r) => sum + r.quantity, 0);
    expect(total).toBe(2);
  });

  it("emits soft-lock TBD (null part) when Scope line has no PN", () => {
    const derived = computeDerivedOpenDemand({
      parts: [
        {
          id: "jlp-1",
          job_line_id: "jl-1",
          part_id: "part-1",
          description: "Camera",
          quantity: 10,
          unit: "ea",
        },
      ],
      lines: new Map([
        [
          "jl-1",
          {
            ...baseLine,
            part_id: null,
            allocations: [],
          },
        ],
      ]),
      requestedCells: new Set(["sp-install:general"]),
      poCoverageByPart: new Map(),
    });
    expect(derived).toHaveLength(1);
    expect(derived[0]?.part_id).toBeNull();
    expect(derived[0]?.item_id).toBe("item-1");
  });
});
