import { describe, expect, it } from "vitest";

import {
  buildOrderRows,
  countUnlockedExcludedForPhase,
  resolveLineMaterialScopePhaseId,
  unlockedExcludedCountByCell,
} from "./job-field-order";
import {
  collectLeafKeys,
  derivePhaseCheckState,
  setPhaseCheckedAcrossLeaves,
  type CascadeCell,
  type CascadeWorkRow,
} from "./job-field-zone-cascade";
import type { JobFieldProgressZoneNode } from "./job-field-progress";

const zoneTree: JobFieldProgressZoneNode[] = [
  {
    key: "scope-root",
    title: "Scope",
    site_zone_id: null,
    children: [
      {
        key: "building",
        title: "Building",
        site_zone_id: "building",
        children: [
          { key: "door-a", title: "Door A", site_zone_id: "door-a" },
          { key: "door-b", title: "Door B", site_zone_id: "door-b" },
        ],
      },
      { key: "general", title: "General", site_zone_id: null },
    ],
  },
];

const workRows: CascadeWorkRow[] = [
  { job_line_id: "line-1", zone_key: "door-a", labor_phase_ids: ["install"] },
  { job_line_id: "line-1", zone_key: "door-b", labor_phase_ids: ["install"] },
  { job_line_id: "line-2", zone_key: "door-a", labor_phase_ids: ["install"] },
];

const scopeIndex = new Map<string, string[]>([
  ["line-1:install", ["sp-1"]],
  ["line-2:install", ["sp-2"]],
]);

describe("zone cascade (Done / Order shared helper)", () => {
  it("parent check cascades to descendant leaves + General-capable leaves", () => {
    const next = setPhaseCheckedAcrossLeaves(
      "building",
      "install",
      true,
      zoneTree,
      workRows,
      [],
      scopeIndex,
    );
    expect(next).toEqual(
      expect.arrayContaining([
        { scope_phase_id: "sp-1", site_zone_id: "door-a", value: true },
        { scope_phase_id: "sp-1", site_zone_id: "door-b", value: true },
        { scope_phase_id: "sp-2", site_zone_id: "door-a", value: true },
      ]),
    );
    expect(derivePhaseCheckState(
      "building",
      "install",
      zoneTree,
      workRows,
      next,
      scopeIndex,
    )).toBe(true);
  });

  it("partial leaf check makes ancestor indeterminate", () => {
    const cells: CascadeCell[] = [
      { scope_phase_id: "sp-1", site_zone_id: "door-a", value: true },
      { scope_phase_id: "sp-2", site_zone_id: "door-a", value: true },
    ];
    expect(
      derivePhaseCheckState(
        "building",
        "install",
        zoneTree,
        workRows,
        cells,
        scopeIndex,
      ),
    ).toBe("indeterminate");
  });

  it("collectLeafKeys includes General under scope root", () => {
    expect(collectLeafKeys(zoneTree, "scope-root")).toEqual([
      "door-a",
      "door-b",
      "general",
    ]);
  });
});

describe("resolveLineMaterialScopePhaseId (MP3)", () => {
  const phases = [
    { id: "sp-program", labor_phase_id: "program", sequence: 1 },
    { id: "sp-install", labor_phase_id: "install", sequence: 2 },
  ];

  it("prefers line override", () => {
    expect(
      resolveLineMaterialScopePhaseId({
        lineMaterialPhaseId: "install",
        ancestryMaterialPhaseIds: ["program"],
        scopePhases: phases,
      }),
    ).toBe("sp-install");
  });

  it("falls back to ancestry then earliest sequence", () => {
    expect(
      resolveLineMaterialScopePhaseId({
        lineMaterialPhaseId: null,
        ancestryMaterialPhaseIds: [null, "program"],
        scopePhases: phases,
      }),
    ).toBe("sp-program");

    expect(
      resolveLineMaterialScopePhaseId({
        lineMaterialPhaseId: null,
        ancestryMaterialPhaseIds: [null],
        scopePhases: phases,
      }),
    ).toBe("sp-program");
  });
});

describe("Order eligibility + unlocked_excluded_count", () => {
  it("buildOrderRows only includes BOM lines, both locked and unlocked", () => {
    const rows = buildOrderRows([
      {
        id: "locked",
        quantity: 2,
        material_locked: true,
        lineMaterialPhaseId: "install",
        ancestryMaterialPhaseIds: [],
        has_bom: true,
        scopePhases: [
          { id: "sp-l", labor_phase_id: "install", sequence: 1 },
        ],
        allocations: [{ site_zone_id: "door-a", quantity: 2 }],
      },
      {
        id: "unlocked",
        quantity: 1,
        material_locked: false,
        lineMaterialPhaseId: "install",
        ancestryMaterialPhaseIds: [],
        has_bom: true,
        scopePhases: [
          { id: "sp-u", labor_phase_id: "install", sequence: 1 },
        ],
        allocations: [{ site_zone_id: "door-a", quantity: 1 }],
      },
      {
        id: "no-bom",
        quantity: 1,
        material_locked: true,
        lineMaterialPhaseId: "install",
        ancestryMaterialPhaseIds: [],
        has_bom: false,
        scopePhases: [
          { id: "sp-n", labor_phase_id: "install", sequence: 1 },
        ],
        allocations: [{ site_zone_id: "door-a", quantity: 1 }],
      },
    ]);

    expect(rows.map((r) => r.job_line_id).sort()).toEqual([
      "locked",
      "unlocked",
    ]);
    expect(rows.find((r) => r.job_line_id === "unlocked")?.material_locked).toBe(
      false,
    );
  });

  it("unlocked_excluded_count is correct per cell and phase selection", () => {
    const orderRows = buildOrderRows([
      {
        id: "locked",
        quantity: 1,
        material_locked: true,
        lineMaterialPhaseId: "install",
        ancestryMaterialPhaseIds: [],
        has_bom: true,
        scopePhases: [
          { id: "sp-l", labor_phase_id: "install", sequence: 1 },
        ],
        allocations: [{ site_zone_id: "door-a", quantity: 1 }],
      },
      {
        id: "unlocked-a",
        quantity: 1,
        material_locked: false,
        lineMaterialPhaseId: "install",
        ancestryMaterialPhaseIds: [],
        has_bom: true,
        scopePhases: [
          { id: "sp-ua", labor_phase_id: "install", sequence: 1 },
        ],
        allocations: [{ site_zone_id: "door-a", quantity: 1 }],
      },
      {
        id: "unlocked-b",
        quantity: 1,
        material_locked: false,
        lineMaterialPhaseId: "install",
        ancestryMaterialPhaseIds: [],
        has_bom: true,
        scopePhases: [
          { id: "sp-ub", labor_phase_id: "install", sequence: 1 },
        ],
        allocations: [{ site_zone_id: "door-b", quantity: 1 }],
      },
    ]);

    const byCell = unlockedExcludedCountByCell(orderRows);
    expect(byCell.get("sp-ua:door-a")).toBe(1);
    expect(byCell.get("sp-l:door-a")).toBeUndefined();

    expect(
      countUnlockedExcludedForPhase(orderRows, ["door-a", "door-b"], "install"),
    ).toBe(2);
    expect(
      countUnlockedExcludedForPhase(orderRows, ["door-a"], "install"),
    ).toBe(1);
  });

  it("locked-only rows are the pool-eligible set (unlocked never counted as locked)", () => {
    const orderRows = buildOrderRows([
      {
        id: "unlocked",
        quantity: 1,
        material_locked: false,
        lineMaterialPhaseId: "install",
        ancestryMaterialPhaseIds: [],
        has_bom: true,
        scopePhases: [
          { id: "sp-u", labor_phase_id: "install", sequence: 1 },
        ],
        allocations: [{ site_zone_id: "door-a", quantity: 1 }],
      },
    ]);
    const lockedEligible = orderRows.filter((r) => r.material_locked);
    expect(lockedEligible).toHaveLength(0);
    expect(countUnlockedExcludedForPhase(orderRows, ["door-a"], "install")).toBe(
      1,
    );
  });
});
