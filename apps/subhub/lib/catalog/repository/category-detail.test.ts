import { describe, expect, it } from "vitest";

import type { CategoryFlatRow } from "./category-tree";
import {
  buildSpecParticipation,
  filterSpecsForCategoryVisibility,
  isSpecVisibleAtCategory,
  type ParticipationContext,
  type SpecDefinitionRow,
  type SpecParticipationRow,
} from "./category-detail";

const def = (
  id: string,
  display_name: string,
): SpecDefinitionRow => ({
  id,
  code: null,
  display_name,
  value_type: "text",
  filter_mode: "required",
  sort_order: 1,
  value_boolean: null,
  value_text: null,
  options: [],
});

const participation = (
  rows: SpecParticipationRow["participates"],
): SpecParticipationRow => ({ participates: rows });

const treeRows: CategoryFlatRow[] = [
  {
    id: "c-1",
    name: "1",
    parent_id: null,
    sort_order: 1,
    csi_code: null,
    default_phase_template_id: null,
  },
  {
    id: "c-1-1",
    name: "1-1",
    parent_id: "c-1",
    sort_order: 1,
    csi_code: null,
    default_phase_template_id: null,
  },
  {
    id: "c-1-1-1",
    name: "1-1-1",
    parent_id: "c-1-1",
    sort_order: 1,
    csi_code: null,
    default_phase_template_id: null,
  },
  {
    id: "c-1-1-1-1",
    name: "1-1-1-1",
    parent_id: "c-1-1-1",
    sort_order: 1,
    csi_code: null,
    default_phase_template_id: null,
  },
  {
    id: "c-1-1-2",
    name: "1-1-2",
    parent_id: "c-1-1",
    sort_order: 2,
    csi_code: null,
    default_phase_template_id: null,
  },
];

const specD = "spec-d";

const treeContext = (): ParticipationContext => ({
  assignByDef: new Map([[specD, "c-1-1"]]),
  excludesByCategory: new Map([["c-1-1-1", new Set([specD])]]),
  categoriesById: new Map(treeRows.map((row) => [row.id, row])),
});

const visibleAt = (categoryId: string, rootCategoryId = "c-1") => {
  const ctx = treeContext();
  const row = {
    spec_def_id: specD,
    assign_category_id: "c-1-1",
    excluded_here: ctx.excludesByCategory.get(categoryId)?.has(specD) ?? false,
  };
  return isSpecVisibleAtCategory(
    categoryId,
    rootCategoryId,
    row,
    ctx.categoriesById,
    ctx.excludesByCategory,
  );
};

describe("isSpecVisibleAtCategory — generic tree", () => {
  it("hides from ancestor of owner", () => {
    expect(visibleAt("c-1")).toBe(false);
  });

  it("shows at owner", () => {
    expect(visibleAt("c-1-1")).toBe(true);
  });

  it("shows at exclude node (know but not use)", () => {
    expect(visibleAt("c-1-1-1")).toBe(true);
  });

  it("hides below exclude branch cut", () => {
    expect(visibleAt("c-1-1-1-1")).toBe(false);
  });

  it("shows at sibling descendant without exclude on path", () => {
    expect(visibleAt("c-1-1-2")).toBe(true);
  });
});

describe("filterSpecsForCategoryVisibility — Fire Alarm", () => {
  const faRoot = "fa-root";
  const faInitiating = "fa-initiating";
  const slc = "slc";
  const specB = "spec-b";

  const fireAlarmContext = (): ParticipationContext => ({
    assignByDef: new Map([
      [slc, faRoot],
      [specB, faInitiating],
    ]),
    excludesByCategory: new Map(),
    categoriesById: new Map([
      {
        id: faRoot,
        name: "Fire Alarm",
        parent_id: null,
        sort_order: 1,
        csi_code: null,
        default_phase_template_id: null,
      },
      {
        id: faInitiating,
        name: "Initiating devices",
        parent_id: faRoot,
        sort_order: 1,
        csi_code: null,
        default_phase_template_id: null,
      },
    ].map((row) => [row.id, row])),
  });

  const fireAlarmParticipation = (
    categoryId: string,
    ctx: ParticipationContext,
  ): SpecParticipationRow =>
    buildSpecParticipation(
      {
        id: categoryId,
        name: categoryId,
        parent_id: categoryId === faRoot ? null : faRoot,
        sort_order: 1,
        csi_code: null,
        default_phase_template_id: null,
        is_root: categoryId === faRoot,
        root_category_id: faRoot,
        root_category_name: "Fire Alarm",
        parent_name: categoryId === faRoot ? null : "Fire Alarm",
      },
      [def(slc, "SLC Protocol"), def(specB, "Spec B")],
      ctx,
    );

  it("root shows SLC and unassigned defs but hides child-owned Spec B", () => {
    const ctx = fireAlarmContext();
    const part = fireAlarmParticipation(faRoot, ctx);
    const filtered = filterSpecsForCategoryVisibility(
      faRoot,
      faRoot,
      [def(slc, "SLC Protocol"), def(specB, "Spec B")],
      part,
      ctx.categoriesById,
      ctx.excludesByCategory,
    );

    expect(filtered.spec_definitions.map((row) => row.display_name)).toEqual([
      "SLC Protocol",
    ]);
  });

  it("initiating child shows owned Spec B and inherited SLC", () => {
    const ctx = fireAlarmContext();
    const part = fireAlarmParticipation(faInitiating, ctx);
    const filtered = filterSpecsForCategoryVisibility(
      faInitiating,
      faRoot,
      [def(slc, "SLC Protocol"), def(specB, "Spec B")],
      part,
      ctx.categoriesById,
      ctx.excludesByCategory,
    );

    expect(filtered.spec_definitions.map((row) => row.display_name).sort()).toEqual(
      ["SLC Protocol", "Spec B"].sort(),
    );
    expect(
      filtered.spec_participation.participates.find((row) => row.spec_def_id === slc)?.state,
    ).toBe("inherited");
    expect(
      filtered.spec_participation.participates.find((row) => row.spec_def_id === specB)?.state,
    ).toBe("assigned");
  });
});

describe("filterSpecsForCategoryVisibility — unassigned namespace", () => {
  const root = "root";
  const unassigned = "unassigned-def";

  it("shows unassigned defs only at scope root", () => {
    const ctx: ParticipationContext = {
      assignByDef: new Map(),
      excludesByCategory: new Map(),
      categoriesById: new Map([
        {
          id: root,
          name: "Root",
          parent_id: null,
          sort_order: 1,
          csi_code: null,
          default_phase_template_id: null,
        },
        {
          id: "child",
          name: "Child",
          parent_id: root,
          sort_order: 1,
          csi_code: null,
          default_phase_template_id: null,
        },
      ].map((row) => [row.id, row])),
    };

    const part = participation([
      {
        spec_def_id: unassigned,
        display_name: "Draft",
        value_type: "text",
        active: false,
        assign_category_id: null,
        excluded_here: false,
        state: "inactive",
      },
    ]);

    const atRoot = filterSpecsForCategoryVisibility(
      root,
      root,
      [def(unassigned, "Draft")],
      part,
      ctx.categoriesById,
      ctx.excludesByCategory,
    );
    expect(atRoot.spec_definitions).toHaveLength(1);

    const atChild = filterSpecsForCategoryVisibility(
      "child",
      root,
      [def(unassigned, "Draft")],
      part,
      ctx.categoriesById,
      ctx.excludesByCategory,
    );
    expect(atChild.spec_definitions).toHaveLength(0);
  });
});
