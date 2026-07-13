import { describe, expect, it } from "vitest";

import {
  mergeLaborPhasesAcrossAncestry,
  mergeLaborPhaseRowsByPhaseId,
} from "../labor-phase-resolve";
import { laborPhaseRowOrigin } from "./item-labor-phase-display";

const row = (labor_phase_id: string, hours_per_unit: number) => ({
  labor_phase_id,
  hours_per_unit,
});

describe("mergeLaborPhaseRowsByPhaseId", () => {
  it("merges across full ancestry with nearest wins", () => {
    const merged = mergeLaborPhaseRowsByPhaseId([
      [],
      [row("phase_a", 1)],
      [row("phase_b", 2)],
    ]);
    expect(merged.map((r) => r.labor_phase_id).sort()).toEqual(["phase_a", "phase_b"]);
  });

  it("keeps zero-hours own override", () => {
    const merged = mergeLaborPhaseRowsByPhaseId([
      [row("phase_a", 0)],
      [row("phase_a", 2), row("phase_b", 1)],
    ]);
    expect(merged).toEqual([row("phase_a", 0), row("phase_b", 1)]);
  });
});

describe("mergeLaborPhasesAcrossAncestry", () => {
  it("tags origin and source per row across 3 levels", () => {
    const merged = mergeLaborPhasesAcrossAncestry([
      { itemId: "leaf", itemName: "Leaf", rows: [row("phase_a", 9)] },
      { itemId: "mid", itemName: "Mid", rows: [row("phase_a", 1), row("phase_b", 2)] },
      { itemId: "root", itemName: "Root", rows: [row("phase_c", 3)] },
    ]);

    expect(merged).toEqual([
      {
        labor_phase_id: "phase_a",
        hours_per_unit: 9,
        origin: "own",
        source_item_id: null,
        source_item_name: null,
      },
      {
        labor_phase_id: "phase_b",
        hours_per_unit: 2,
        origin: "inherited",
        source_item_id: "mid",
        source_item_name: "Mid",
      },
      {
        labor_phase_id: "phase_c",
        hours_per_unit: 3,
        origin: "inherited",
        source_item_id: "root",
        source_item_name: "Root",
      },
    ]);
  });
});

describe("laborPhaseRowOrigin", () => {
  it("returns own when an own row exists for the phase", () => {
    expect(laborPhaseRowOrigin("p1", [{ labor_phase_id: "p1" }])).toBe("own");
  });

  it("returns inherited when no own row exists", () => {
    expect(laborPhaseRowOrigin("p1", [{ labor_phase_id: "p2" }])).toBe("inherited");
  });
});
