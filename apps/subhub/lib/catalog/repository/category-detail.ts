import type { Pool } from "pg";

import type { SpecParticipationState } from "../descriptors/category-detail";
import {
  hasExcludeOnAssignPath,
  isAncestorOrSelf,
  isEffectiveSpecDef,
} from "./category-effective-specs";
import {
  loadAllCategories,
  resolveRootCategoryId,
  type CategoryFlatRow,
} from "./category-tree";

export type CategoryDetailRow = {
  csi_code: string | null;
  default_phase_template_id: string | null;
  id: string;
  is_root: boolean;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  root_category_id: string | null;
  root_category_name: string | null;
  sort_order: number;
};

export type SpecOptionRow = {
  code: string | null;
  display_name: string;
  id: string;
  sort_order: number;
};

export type SpecDefinitionRow = {
  code: string | null;
  display_name: string;
  filter_mode: "prefer" | "required";
  id: string;
  options: SpecOptionRow[];
  sort_order: number;
  value_boolean: boolean | null;
  value_text: string | null;
  value_type: "boolean" | "enum" | "text";
};

export type SpecParticipationRow = {
  participates: Array<{
    active: boolean;
    assign_category_id: string | null;
    display_name: string;
    excluded_here: boolean;
    spec_def_id: string;
    state: SpecParticipationState;
    value_type: "boolean" | "enum" | "text";
  }>;
};

export type CategoryDetailRelated = {
  spec_definitions: SpecDefinitionRow[];
  spec_participation: SpecParticipationRow;
};

export const loadCategoryDetail = async (
  pool: Pool,
  id: string,
): Promise<CategoryDetailRow | undefined> => {
  const result = await pool.query<{
    csi_code: string | null;
    default_phase_template_id: string | null;
    id: string;
    name: string;
    parent_id: string | null;
    parent_name: string | null;
    sort_order: number;
  }>(
    `SELECT
       c.id,
       c.name,
       c.parent_id,
       c.sort_order,
       c.csi_code,
       c.default_phase_template_id,
       parent.name AS parent_name
     FROM category c
     LEFT JOIN category parent ON parent.id = c.parent_id
     WHERE c.id = $1`,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return undefined;
  }

  const allRows = await loadAllCategories(pool);
  const rootCategoryId = resolveRootCategoryId(allRows, id) ?? null;
  const rootRow = rootCategoryId
    ? allRows.find((category) => category.id === rootCategoryId)
    : undefined;

  return {
    id: row.id,
    name: row.name,
    parent_id: row.parent_id,
    parent_name: row.parent_name,
    sort_order: row.sort_order,
    csi_code: row.csi_code,
    default_phase_template_id: row.default_phase_template_id,
    is_root: row.parent_id === null,
    root_category_id: rootCategoryId,
    root_category_name: rootRow?.name ?? null,
  };
};

const loadSpecOptions = async (
  pool: Pool,
  specDefIds: string[],
): Promise<Map<string, SpecOptionRow[]>> => {
  if (specDefIds.length === 0) {
    return new Map();
  }

  const result = await pool.query<SpecOptionRow & { spec_def_id: string }>(
    `SELECT id, spec_def_id, code, display_name, sort_order
     FROM spec_option
     WHERE spec_def_id = ANY($1::uuid[])
     ORDER BY sort_order ASC, display_name ASC, id ASC`,
    [specDefIds],
  );

  const byDefId = new Map<string, SpecOptionRow[]>();
  for (const row of result.rows) {
    const options = byDefId.get(row.spec_def_id) ?? [];
    options.push({
      id: row.id,
      code: row.code,
      display_name: row.display_name,
      sort_order: row.sort_order,
    });
    byDefId.set(row.spec_def_id, options);
  }

  return byDefId;
};

export const loadRootSpecDefinitions = async (
  pool: Pool,
  rootCategoryId: string,
): Promise<SpecDefinitionRow[]> => {
  const defsResult = await pool.query<{
    code: string | null;
    display_name: string;
    filter_mode: "prefer" | "required";
    id: string;
    sort_order: number;
    value_type: "boolean" | "enum" | "text";
  }>(
    `WITH RECURSIVE subtree AS (
       SELECT id FROM category WHERE id = $1
       UNION ALL
       SELECT c.id FROM category c JOIN subtree s ON c.parent_id = s.id
     )
     SELECT id, code, display_name, value_type, filter_mode, sort_order
     FROM spec_def
     WHERE category_id IN (SELECT id FROM subtree)
     ORDER BY sort_order ASC, display_name ASC, id ASC`,
    [rootCategoryId],
  );

  const optionsByDefId = await loadSpecOptions(
    pool,
    defsResult.rows.map((row) => row.id),
  );

  return defsResult.rows.map((row) => ({
    id: row.id,
    code: row.code,
    display_name: row.display_name,
    value_type: row.value_type,
    filter_mode: row.filter_mode,
    sort_order: row.sort_order,
    value_text: null,
    value_boolean: null,
    options: optionsByDefId.get(row.id) ?? [],
  }));
};

const emptySpecParticipation = (): SpecParticipationRow => ({
  participates: [],
});

const computeParticipationState = (
  categoryId: string,
  specDefId: string,
  assignCategoryId: string | undefined,
  active: boolean,
  excludeHere: boolean,
  categoriesById: Map<string, CategoryFlatRow>,
  excludesByCategory: Map<string, Set<string>>,
): SpecParticipationState => {
  if (assignCategoryId === categoryId) {
    return active ? "assigned" : "inactive";
  }

  if (excludeHere) {
    return "excluded";
  }

  if (
    assignCategoryId &&
    hasExcludeOnAssignPath(
      assignCategoryId,
      categoryId,
      specDefId,
      excludesByCategory,
      categoriesById,
    )
  ) {
    return "inactive";
  }

  if (
    assignCategoryId &&
    isAncestorOrSelf(assignCategoryId, categoryId, categoriesById) &&
    active
  ) {
    return "inherited";
  }

  return "inactive";
};

export type ParticipationContext = {
  assignByDef: Map<string, string>;
  categoriesById: Map<string, CategoryFlatRow>;
  excludesByCategory: Map<string, Set<string>>;
};

const loadParticipationContext = async (pool: Pool): Promise<ParticipationContext> => {
  const [assignResult, excludesResult, allCategories] = await Promise.all([
    pool.query<{ category_id: string; spec_def_id: string }>(
      `SELECT id AS spec_def_id, category_id FROM spec_def`,
    ),
    pool.query<{ category_id: string; spec_def_id: string }>(
      `SELECT category_id, spec_def_id FROM category_spec_exclude`,
    ),
    loadAllCategories(pool),
  ]);

  const assignByDef = new Map(
    assignResult.rows.map((row) => [row.spec_def_id, row.category_id]),
  );
  const excludesByCategory = new Map<string, Set<string>>();
  for (const row of excludesResult.rows) {
    const bucket = excludesByCategory.get(row.category_id) ?? new Set<string>();
    bucket.add(row.spec_def_id);
    excludesByCategory.set(row.category_id, bucket);
  }

  return {
    assignByDef,
    excludesByCategory,
    categoriesById: new Map(allCategories.map((row) => [row.id, row])),
  };
};

export const isSpecVisibleAtCategory = (
  categoryId: string,
  rootCategoryId: string,
  row: {
    assign_category_id: string | null;
    excluded_here: boolean;
    spec_def_id: string;
  },
  categoriesById: Map<string, CategoryFlatRow>,
  excludesByCategory: Map<string, Set<string>>,
): boolean => {
  const assignCategoryId = row.assign_category_id;

  if (!assignCategoryId) {
    return categoryId === rootCategoryId;
  }

  if (!isAncestorOrSelf(assignCategoryId, categoryId, categoriesById)) {
    return false;
  }

  if (
    hasExcludeOnAssignPath(
      assignCategoryId,
      categoryId,
      row.spec_def_id,
      excludesByCategory,
      categoriesById,
    ) &&
    !row.excluded_here
  ) {
    return false;
  }

  return true;
};

export const buildSpecParticipation = (
  category: CategoryDetailRow,
  defs: SpecDefinitionRow[],
  ctx: ParticipationContext,
): SpecParticipationRow => {
  const participation = {
    assignByDef: ctx.assignByDef,
    excludesByCategory: ctx.excludesByCategory,
  };
  const excludeHere = ctx.excludesByCategory.get(category.id) ?? new Set<string>();

  const participates = defs.map((def) => {
    const assignCategoryId = ctx.assignByDef.get(def.id);
    const active = isEffectiveSpecDef(
      category.id,
      def.id,
      assignCategoryId,
      participation,
      ctx.categoriesById,
    );

    return {
      spec_def_id: def.id,
      display_name: def.display_name,
      value_type: def.value_type,
      active,
      assign_category_id: assignCategoryId ?? null,
      excluded_here: excludeHere.has(def.id),
      state: computeParticipationState(
        category.id,
        def.id,
        assignCategoryId,
        active,
        excludeHere.has(def.id),
        ctx.categoriesById,
        ctx.excludesByCategory,
      ),
    };
  });

  return { participates };
};

export const loadCategorySpecParticipation = async (
  pool: Pool,
  category: CategoryDetailRow,
): Promise<SpecParticipationRow> => {
  const rootCategoryId = category.is_root ? category.id : category.root_category_id;
  if (!rootCategoryId) {
    return emptySpecParticipation();
  }

  const defs = await loadRootSpecDefinitions(pool, rootCategoryId);
  if (defs.length === 0) {
    return emptySpecParticipation();
  }

  const ctx = await loadParticipationContext(pool);
  return buildSpecParticipation(category, defs, ctx);
};

export const filterSpecsForCategoryVisibility = (
  categoryId: string,
  rootCategoryId: string,
  specDefinitions: SpecDefinitionRow[],
  participation: SpecParticipationRow,
  categoriesById: Map<string, CategoryFlatRow>,
  excludesByCategory: Map<string, Set<string>>,
): CategoryDetailRelated => {
  const visibleParticipates = participation.participates.filter((row) =>
    isSpecVisibleAtCategory(
      categoryId,
      rootCategoryId,
      row,
      categoriesById,
      excludesByCategory,
    ),
  );
  const visibleDefIds = new Set(visibleParticipates.map((row) => row.spec_def_id));

  return {
    spec_definitions: specDefinitions.filter((def) => visibleDefIds.has(def.id)),
    spec_participation: { participates: visibleParticipates },
  };
};

export const loadCategoryDetailRelated = async (
  pool: Pool,
  categoryId: string,
): Promise<CategoryDetailRelated> => {
  const category = await loadCategoryDetail(pool, categoryId);
  if (!category) {
    return { spec_definitions: [], spec_participation: emptySpecParticipation() };
  }

  const rootCategoryId = category.is_root ? category.id : category.root_category_id;
  const allSpecDefinitions = rootCategoryId
    ? await loadRootSpecDefinitions(pool, rootCategoryId)
    : [];
  const ctx = await loadParticipationContext(pool);
  const spec_participation = buildSpecParticipation(category, allSpecDefinitions, ctx);

  if (!rootCategoryId) {
    return { spec_definitions: [], spec_participation };
  }

  return filterSpecsForCategoryVisibility(
    categoryId,
    rootCategoryId,
    allSpecDefinitions,
    spec_participation,
    ctx.categoriesById,
    ctx.excludesByCategory,
  );
};
