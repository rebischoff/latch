import { describe, expect, it } from "vitest";

import {
  deriveZoneOrders,
  isOrderableBomPart,
  zoneAttributableBomQty,
  zoneOrderQty,
} from "./job-field-zone-order";
import {
  computeReportProgressPct,
  fieldProgressCellsChanged,
  reportCellWeightKey,
} from "./job-progress-report";

describe("fieldProgressCellsChanged", () => {
  it("returns false when boards match ignoring order", () => {
    expect(
      fieldProgressCellsChanged(
        [
          { scope_phase_id: "a", site_zone_id: null, complete: true },
          { scope_phase_id: "b", site_zone_id: "z1", complete: false },
        ],
        [
          { scope_phase_id: "b", site_zone_id: "z1", complete: false },
          { scope_phase_id: "a", site_zone_id: null, complete: true },
        ],
      ),
    ).toBe(false);
  });

  it("returns true when a complete flag flips", () => {
    expect(
      fieldProgressCellsChanged(
        [{ scope_phase_id: "a", site_zone_id: null, complete: false }],
        [{ scope_phase_id: "a", site_zone_id: null, complete: true }],
      ),
    ).toBe(true);
  });

  it("returns true when cell count changes", () => {
    expect(
      fieldProgressCellsChanged(
        [],
        [{ scope_phase_id: "a", site_zone_id: null, complete: false }],
      ),
    ).toBe(true);
  });
});

describe("deriveZoneOrders", () => {
  it("marks a zone ordered from active requests and locked on PO", () => {
    const rows = deriveZoneOrders({
      zoneKeys: ["floor-2", "lobby", "general"],
      lines: [
        { site_zone_id: "floor-2", status: "open" },
        { site_zone_id: "lobby", status: "on_purchase_order" },
      ],
    });

    expect(rows).toEqual([
      {
        zone_key: "floor-2",
        site_zone_id: "floor-2",
        ordered: true,
        locked: false,
      },
      {
        zone_key: "lobby",
        site_zone_id: "lobby",
        ordered: true,
        locked: true,
      },
      {
        zone_key: "general",
        site_zone_id: null,
        ordered: false,
        locked: false,
      },
    ]);
  });

  it("defaults unchecked while no active demand lines exist", () => {
    const rows = deriveZoneOrders({
      zoneKeys: ["floor-2"],
      lines: [],
    });
    expect(rows[0]).toMatchObject({ ordered: false, locked: false });
  });
});

describe("zoneAttributableBomQty + zoneOrderQty", () => {
  it("maps leaf share of BOM qty (L22) and caps at remaining", () => {
    // Line qty 10, Floor 2 alloc 4, part demand 20 → zone demand 8
    expect(
      zoneAttributableBomQty({ allocQty: 4, lineQty: 10, partQty: 20 }),
    ).toBe(8);
    expect(zoneOrderQty({ zoneDemand: 8, remaining: 5 })).toBe(5);
    expect(zoneOrderQty({ zoneDemand: 8, remaining: 12 })).toBe(8);
  });

  it("returns 0 when allocation or part qty is empty", () => {
    expect(
      zoneAttributableBomQty({ allocQty: 0, lineQty: 10, partQty: 5 }),
    ).toBe(0);
  });
});

describe("isOrderableBomPart (L18)", () => {
  it("allows engineered part_id or soft-spec description", () => {
    expect(isOrderableBomPart({ part_id: "p1", description: "" })).toBe(true);
    expect(
      isOrderableBomPart({ part_id: null, description: "10ft CAT6" }),
    ).toBe(true);
  });

  it("blocks empty TBD", () => {
    expect(isOrderableBomPart({ part_id: null, description: "  " })).toBe(
      false,
    );
    expect(isOrderableBomPart({ part_id: null, description: null })).toBe(
      false,
    );
  });
});

describe("reportCellWeightKey (PR1)", () => {
  it("matches the living-board zone-key convention (General = null)", () => {
    expect(reportCellWeightKey("sp-1", "zone-a")).toBe("sp-1:zone-a");
    expect(reportCellWeightKey("sp-1", null)).toBe("sp-1:general");
  });
});

describe("computeReportProgressPct (PR1 — frozen weight basis)", () => {
  it("weights by frozen hours, same formula as the live board", () => {
    const pct = computeReportProgressPct([
      { weight_hours: 8, complete: true },
      { weight_hours: 1, complete: false },
      { weight_hours: 1, complete: false },
    ]);
    expect(pct).toBe(80);
  });

  it("stays stable even if 'current' hours would differ (no live join)", () => {
    // Snapshot taken when Install was 8h; a later re-budget could change scope_phase
    // hours, but the report only ever reads its own frozen weight_hours — there is no
    // live scope_phase join here, so nothing could move this result after the fact.
    const frozen = [
      { weight_hours: 8, complete: true },
      { weight_hours: 2, complete: false },
    ];
    expect(computeReportProgressPct(frozen)).toBe(80);
    expect(computeReportProgressPct(frozen)).toBe(80);
  });

  it("returns 0 when no countable weight", () => {
    expect(computeReportProgressPct([])).toBe(0);
    expect(computeReportProgressPct([{ weight_hours: 0, complete: true }])).toBe(
      0,
    );
  });
});
