import { describe, expect, it } from "vitest";

import {
  buildFieldProgressSummary,
  computeFieldProgressPct,
  deriveFieldLifecycle,
  FIELD_PROGRESS_STALE_DAYS,
} from "./job-field-progress";
import { buildFieldProgressSlices } from "./job-field-progress-load";

describe("computeFieldProgressPct", () => {
  it("weights by hours, not equal phase count", () => {
    // Install-heavy: 8h Install + 1h Program + 1h Test; only Install done → 80%
    const pct = computeFieldProgressPct([
      { hours: 8, complete: true },
      { hours: 1, complete: false },
      { hours: 1, complete: false },
    ]);
    expect(pct).toBe(80);
  });

  it("returns 0 when no countable hours", () => {
    expect(computeFieldProgressPct([])).toBe(0);
    expect(computeFieldProgressPct([{ hours: 0, complete: true }])).toBe(0);
  });

  it("returns 100 when all complete", () => {
    expect(
      computeFieldProgressPct([
        { hours: 2, complete: true },
        { hours: 3, complete: true },
      ]),
    ).toBe(100);
  });
});

describe("deriveFieldLifecycle", () => {
  it("maps cancelled / 0% / mid / 100%", () => {
    expect(
      deriveFieldLifecycle({
        job_status: "cancelled",
        progress_pct: 0,
        field_progress_updated_at: null,
      }).lifecycle,
    ).toBe("cancelled");

    expect(
      deriveFieldLifecycle({
        job_status: "active",
        progress_pct: 0,
        field_progress_updated_at: null,
      }).lifecycle,
    ).toBe("not_started");

    expect(
      deriveFieldLifecycle({
        job_status: "active",
        progress_pct: 40,
        field_progress_updated_at: new Date(),
      }).lifecycle,
    ).toBe("in_progress");

    expect(
      deriveFieldLifecycle({
        job_status: "active",
        progress_pct: 100,
        field_progress_updated_at: new Date(),
      }).lifecycle,
    ).toBe("completed");
  });

  it("marks stale when in progress and quiet past threshold", () => {
    const now = new Date("2026-07-16T00:00:00Z");
    const old = new Date("2026-06-01T00:00:00Z");
    const result = deriveFieldLifecycle({
      job_status: "active",
      progress_pct: 25,
      field_progress_updated_at: old,
      now,
      stale_days: FIELD_PROGRESS_STALE_DAYS,
    });
    expect(result.lifecycle).toBe("in_progress");
    expect(result.stale).toBe(true);
  });

  it("does not mark stale when recently updated", () => {
    const now = new Date("2026-07-16T00:00:00Z");
    const recent = new Date("2026-07-10T00:00:00Z");
    const result = deriveFieldLifecycle({
      job_status: "active",
      progress_pct: 25,
      field_progress_updated_at: recent,
      now,
    });
    expect(result.stale).toBe(false);
  });
});

describe("buildFieldProgressSlices", () => {
  it("keeps multi-place slices independent (Door 12 vs Door 14)", () => {
    const slices = buildFieldProgressSlices({
      lines: [
        {
          id: "line-1",
          description: "Strobe",
          quantity: 2,
          item_name: "Strobe",
          part_id: null,
          part_mpn: null,
        },
      ],
      allocations: [
        {
          job_line_id: "line-1",
          site_zone_id: "door-12",
          quantity: 1,
          site_zone_name: "Door 12",
        },
        {
          job_line_id: "line-1",
          site_zone_id: "door-14",
          quantity: 1,
          site_zone_name: "Door 14",
        },
      ],
      phases: [
        {
          id: "sp-install",
          job_line_id: "line-1",
          labor_phase_id: "lp-install",
          name: "Install",
          sequence: 1,
          sort_order: 1,
          hours_per_unit: 2,
        },
      ],
    });

    expect(slices).toHaveLength(2);
    expect(slices.map((s) => s.site_zone_id).sort()).toEqual([
      "door-12",
      "door-14",
    ]);
    expect(slices.every((s) => s.hours === 2)).toBe(true);
  });

  it("includes General for unplaced qty", () => {
    const slices = buildFieldProgressSlices({
      lines: [
        {
          id: "line-1",
          description: "Strobe",
          quantity: 5,
          item_name: "Strobe",
          part_id: null,
          part_mpn: null,
        },
      ],
      allocations: [
        {
          job_line_id: "line-1",
          site_zone_id: "door-12",
          quantity: 2,
          site_zone_name: "Door 12",
        },
      ],
      phases: [
        {
          id: "sp-install",
          job_line_id: "line-1",
          labor_phase_id: "lp-install",
          name: "Install",
          sequence: 1,
          sort_order: 1,
          hours_per_unit: 1,
        },
      ],
    });

    const general = slices.find((s) => s.site_zone_id === null);
    expect(general?.hours).toBe(3);
  });
});

describe("buildFieldProgressSummary", () => {
  it("excludes voided lines by only counting provided active slices", () => {
    const summary = buildFieldProgressSummary({
      job_status: "active",
      field_progress_updated_at: null,
      slices: [
        {
          scope_phase_id: "sp-1",
          labor_phase_id: "lp-1",
          site_zone_id: null,
          zone_key: "general",
          hours: 4,
        },
      ],
      cells: [
        { scope_phase_id: "sp-1", site_zone_id: null, complete: true },
      ],
    });
    expect(summary.progress_pct).toBe(100);
    expect(summary.lifecycle).toBe("completed");
  });
});
