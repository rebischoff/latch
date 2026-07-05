import { describe, expect, it } from "vitest";

import type { CategoryFlatRow } from "./category-tree";
import {
  computeEffectiveSpecDefIds,
  hasExcludeOnAssignPath,
  isEffectiveSpecDef,
} from "./category-effective-specs";

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

const chainRows: CategoryFlatRow[] = [
  {
    id: "a",
    name: "a",
    parent_id: null,
    sort_order: 1,
    csi_code: null,
    default_phase_template_id: null,
  },
  {
    id: "b",
    name: "b",
    parent_id: "a",
    sort_order: 1,
    csi_code: null,
    default_phase_template_id: null,
  },
  {
    id: "c",
    name: "c",
    parent_id: "b",
    sort_order: 1,
    csi_code: null,
    default_phase_template_id: null,
  },
  {
    id: "d",
    name: "d",
    parent_id: "c",
    sort_order: 1,
    csi_code: null,
    default_phase_template_id: null,
  },
];

const slc = "00000000-0000-4000-8000-000000000001";
const color = "00000000-0000-4000-8000-000000000002";
const series = "00000000-0000-4000-8000-000000000003";
const defX = "00000000-0000-4000-8000-000000000010";

const fireAlarmParticipation = {
  assignByDef: new Map<string, string>([
    [slc, "fa-root"],
    [color, "fa-notification"],
    [series, "fa-notification"],
  ]),
  excludesByCategory: new Map<string, Set<string>>([
    ["fa-notification", new Set([slc])],
  ]),
};

describe("computeEffectiveSpecDefIds — Fire Alarm", () => {
  const categoriesById = new Map(fireAlarmRows.map((row) => [row.id, row]));

  it("inherits assignment from root when child has no rows", () => {
    const effective = computeEffectiveSpecDefIds(
      "fa-initiating",
      categoriesById,
      fireAlarmParticipation,
    );

    expect([...effective]).toEqual([slc]);
  });

  it("applies branch exclude and local assignments on nested nodes", () => {
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

describe("computeEffectiveSpecDefIds — assign-once chain", () => {
  const categoriesById = new Map(chainRows.map((row) => [row.id, row]));

  const chainParticipation = {
    assignByDef: new Map<string, string>([[defX, "b"]]),
    excludesByCategory: new Map<string, Set<string>>([["c", new Set([defX])]]),
  };

  it("assign(D) is unique per def", () => {
    expect(chainParticipation.assignByDef.get(defX)).toBe("b");
    expect([...chainParticipation.assignByDef.keys()]).toHaveLength(1);
  });

  it("exclude on c removes def for c and d", () => {
    expect(
      [...computeEffectiveSpecDefIds("c", categoriesById, chainParticipation)],
    ).toEqual([]);
    expect(
      [...computeEffectiveSpecDefIds("d", categoriesById, chainParticipation)],
    ).toEqual([]);
  });

  it("effective on b without rows on descendants", () => {
    expect(
      [...computeEffectiveSpecDefIds("b", categoriesById, chainParticipation)],
    ).toEqual([defX]);
  });

  it("d cannot restore def after exclude on c", () => {
    const effectiveAtD = isEffectiveSpecDef(
      "d",
      defX,
      "b",
      chainParticipation,
      categoriesById,
    );
    expect(effectiveAtD).toBe(false);
    expect(
      hasExcludeOnAssignPath("b", "d", defX, chainParticipation.excludesByCategory, categoriesById),
    ).toBe(true);
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
