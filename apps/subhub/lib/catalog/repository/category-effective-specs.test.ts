import { describe, expect, it } from "vitest";

import type { CategoryFlatRow } from "./category-tree";
import { computeEffectiveSpecDefIds } from "./category-effective-specs";

const fireAlarmRows: CategoryFlatRow[] = [
  {
    id: "fa-root",
    name: "Fire Alarm",
    parent_id: null,
    sort_order: 1,
    csi_code: null,
    default_phase_template_id: null,
  },
  {
    id: "fa-initiating",
    name: "Initiating devices",
    parent_id: "fa-root",
    sort_order: 1,
    csi_code: null,
    default_phase_template_id: null,
  },
  {
    id: "fa-notification",
    name: "Notification appliances",
    parent_id: "fa-root",
    sort_order: 2,
    csi_code: null,
    default_phase_template_id: null,
  },
];

const slc = "00000000-0000-4000-8000-000000000001";
const color = "00000000-0000-4000-8000-000000000002";
const series = "00000000-0000-4000-8000-000000000003";

const fireAlarmParticipation = {
  includesByCategory: new Map<string, Set<string>>([
    ["fa-root", new Set([slc])],
    ["fa-notification", new Set([color, series])],
  ]),
  excludesByCategory: new Map<string, Set<string>>([
    ["fa-notification", new Set([slc])],
  ]),
};

describe("computeEffectiveSpecDefIds", () => {
  const categoriesById = new Map(fireAlarmRows.map((row) => [row.id, row]));

  it("inherits parent effective set when child has no rows", () => {
    const effective = computeEffectiveSpecDefIds(
      "fa-initiating",
      categoriesById,
      fireAlarmParticipation,
    );

    expect([...effective]).toEqual([slc]);
  });

  it("applies include and exclude deltas on nested nodes", () => {
    const effective = computeEffectiveSpecDefIds(
      "fa-notification",
      categoriesById,
      fireAlarmParticipation,
    );

    expect([...effective].sort()).toEqual([color, series].sort());
  });

  it("unions effective sets across multiple category links", () => {
    const itemCategories = ["fa-initiating", "fa-notification"];
    const union = new Set<string>();

    for (const categoryId of itemCategories) {
      for (const specDefId of computeEffectiveSpecDefIds(
        categoryId,
        categoriesById,
        fireAlarmParticipation,
      )) {
        union.add(specDefId);
      }
    }

    expect([...union].sort()).toEqual([slc, color, series].sort());
  });
});

describe("scopePanelDefs union", () => {
  it("collects effective participation across the subtree", () => {
    const categoriesById = new Map(fireAlarmRows.map((row) => [row.id, row]));
    const subtreeIds = ["fa-root", "fa-initiating", "fa-notification"];
    const union = new Set<string>();

    for (const categoryId of subtreeIds) {
      for (const specDefId of computeEffectiveSpecDefIds(
        categoryId,
        categoriesById,
        fireAlarmParticipation,
      )) {
        union.add(specDefId);
      }
    }

    expect([...union].sort()).toEqual([slc, color, series].sort());
  });
});
