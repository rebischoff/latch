import { describe, expect, it } from "vitest";

import { buildItemLaborPhaseDisplayRows } from "./item-labor-phase-ui-state";

describe("buildItemLaborPhaseDisplayRows", () => {
  it("shows own editable rows plus inherited peers not overridden", () => {
    const rows = buildItemLaborPhaseDisplayRows({
      ownRows: [
        {
          labor_phase_id: "program",
          labor_phase_name: "Program",
          labor_rate_type_id: "r1",
          labor_rate_type_name: "Tech",
          hours_per_unit: 3,
          sort_order: 1,
        },
      ],
      resolvedRows: [
        {
          labor_phase_id: "program",
          labor_phase_name: "Program",
          labor_rate_type_id: "r1",
          labor_rate_type_name: "Tech",
          hours_per_unit: 3,
          origin: "own",
          source_item_id: null,
          source_item_name: null,
          sort_order: 1,
        },
        {
          labor_phase_id: "test",
          labor_phase_name: "Test",
          labor_rate_type_id: "r1",
          labor_rate_type_name: "Tech",
          hours_per_unit: 1,
          origin: "inherited",
          source_item_id: "cat-1",
          source_item_name: "Speakers",
          sort_order: 2,
        },
        {
          labor_phase_id: "install",
          labor_phase_name: "Install",
          labor_rate_type_id: "r1",
          labor_rate_type_name: "Tech",
          hours_per_unit: 3,
          origin: "inherited",
          source_item_id: "cat-1",
          source_item_name: "Speakers",
          sort_order: 3,
        },
      ],
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ kind: "own", labor_phase_id: "program", hours_per_unit: 3 });
    expect(rows[1]).toMatchObject({
      kind: "inherited",
      labor_phase_id: "test",
      source_item_name: "Speakers",
    });
    expect(rows[2]).toMatchObject({ kind: "inherited", labor_phase_id: "install" });
  });

  it("keeps own zero-hours rows visible", () => {
    const rows = buildItemLaborPhaseDisplayRows({
      ownRows: [
        {
          labor_phase_id: "install",
          labor_phase_name: "Install",
          labor_rate_type_id: "r1",
          labor_rate_type_name: "Tech",
          hours_per_unit: 0,
        },
      ],
      resolvedRows: [
        {
          labor_phase_id: "install",
          labor_phase_name: "Install",
          labor_rate_type_id: "r1",
          labor_rate_type_name: "Tech",
          hours_per_unit: 0,
          origin: "own",
          source_item_id: null,
          source_item_name: null,
        },
      ],
    });

    expect(rows).toEqual([
      expect.objectContaining({
        kind: "own",
        labor_phase_id: "install",
        hours_per_unit: 0,
      }),
    ]);
  });

  it("returns empty when neither own nor inherited rows exist", () => {
    expect(buildItemLaborPhaseDisplayRows({ ownRows: [], resolvedRows: [] })).toEqual([]);
  });
});
