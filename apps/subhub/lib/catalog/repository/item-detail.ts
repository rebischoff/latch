import type { Pool } from "pg";

import type { SpecParticipationState } from "../descriptors/item-detail";
import {
  hasExcludeOnAssignPath,
  isAncestorOrSelf,
  isEffectiveSpecDef,
} from "./item-effective-specs";
import {
  loadAllItems,
  resolveRootItemId,
  type ItemFlatRow,
} from "./item-tree";

export type ItemDetailRow = {
  csi_code: string | null;
  fallback_unit_cost: number;
  freight_rate_type_id: string | null;
  id: string;
  incidental_rate_type_id: string | null;
  is_root: boolean;
  markup_type_id: string | null;
  name: string;
  node_type: "scope" | "category" | "item";
  parent_id: string | null;
  parent_name: string | null;
  root_item_id: string | null;
  root_item_name: string | null;
  sort_order: number;
};

export type ItemLaborPhaseRow = {
  hours_per_unit: number;
  labor_phase_id: string;
  labor_phase_name: string;
  labor_rate_type_id: string;
  labor_rate_type_name: string;
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
    assign_item_id: string | null;
    display_name: string;
    excluded_here: boolean;
    spec_def_id: string;
    state: SpecParticipationState;
    value_type: "boolean" | "enum" | "text";
  }>;
};

export type ItemDetailRelated = {
  item_labor_phase: ItemLaborPhaseRow[];
  spec_definitions: SpecDefinitionRow[];
  spec_participation: SpecParticipationRow;
};

export const loadItemDetail = async (
  pool: Pool,
  id: string,
): Promise<ItemDetailRow | undefined> => {
  const result = await pool.query<{
    csi_code: string | null;
    fallback_unit_cost: string;
    freight_rate_type_id: string | null;
    id: string;
    incidental_rate_type_id: string | null;
    markup_type_id: string | null;
    name: string;
    node_type: "scope" | "category" | "item";
    parent_id: string | null;
    parent_name: string | null;
    sort_order: number;
  }>(
    `SELECT
       c.id,
       c.name,
       c.parent_id,
       c.node_type,
       c.sort_order,
       c.csi_code,
       c.fallback_unit_cost,
       c.freight_rate_type_id,
       c.incidental_rate_type_id,
       c.markup_type_id,
       parent.name AS parent_name
     FROM item c
     LEFT JOIN item parent ON parent.id = c.parent_id
     WHERE c.id = $1`,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return undefined;
  }

  const allRows = await loadAllItems(pool);
  const rootItemId = resolveRootItemId(allRows, id) ?? null;
  const rootRow = rootItemId
    ? allRows.find((category) => category.id === rootItemId)
    : undefined;

  return {
    id: row.id,
    name: row.name,
    parent_id: row.parent_id,
    parent_name: row.parent_name,
    node_type: row.node_type,
    sort_order: row.sort_order,
    csi_code: row.csi_code,
    fallback_unit_cost: Number(row.fallback_unit_cost ?? 0),
    freight_rate_type_id: row.freight_rate_type_id,
    incidental_rate_type_id: row.incidental_rate_type_id,
    markup_type_id: row.markup_type_id,
    is_root: row.parent_id === null,
    root_item_id: rootItemId,
    root_item_name: rootRow?.name ?? null,
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
  rootItemId: string,
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
       SELECT id FROM item WHERE id = $1
       UNION ALL
       SELECT c.id FROM item c JOIN subtree s ON c.parent_id = s.id
     )
     SELECT id, code, display_name, value_type, filter_mode, sort_order
     FROM spec_def
     WHERE item_id IN (SELECT id FROM subtree)
     ORDER BY sort_order ASC, display_name ASC, id ASC`,
    [rootItemId],
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
  assignItemId: string | undefined,
  active: boolean,
  excludeHere: boolean,
  categoriesById: Map<string, ItemFlatRow>,
  excludesByItem: Map<string, Set<string>>,
): SpecParticipationState => {
  if (assignItemId === categoryId) {
    return active ? "assigned" : "inactive";
  }

  if (excludeHere) {
    return "excluded";
  }

  if (
    assignItemId &&
    hasExcludeOnAssignPath(
      assignItemId,
      categoryId,
      specDefId,
      excludesByItem,
      categoriesById,
    )
  ) {
    return "inactive";
  }

  if (
    assignItemId &&
    isAncestorOrSelf(assignItemId, categoryId, categoriesById) &&
    active
  ) {
    return "inherited";
  }

  return "inactive";
};

export type ParticipationContext = {
  assignByDef: Map<string, string>;
  categoriesById: Map<string, ItemFlatRow>;
  excludesByItem: Map<string, Set<string>>;
};

const loadParticipationContext = async (pool: Pool): Promise<ParticipationContext> => {
  const [assignResult, excludesResult, allCategories] = await Promise.all([
    pool.query<{ item_id: string; spec_def_id: string }>(
      `SELECT id AS spec_def_id, item_id FROM spec_def`,
    ),
    pool.query<{ item_id: string; spec_def_id: string }>(
      `SELECT item_id, spec_def_id FROM item_spec_exclude`,
    ),
    loadAllItems(pool),
  ]);

  const assignByDef = new Map(
    assignResult.rows.map((row) => [row.spec_def_id, row.item_id]),
  );
  const excludesByItem = new Map<string, Set<string>>();
  for (const row of excludesResult.rows) {
    const bucket = excludesByItem.get(row.item_id) ?? new Set<string>();
    bucket.add(row.spec_def_id);
    excludesByItem.set(row.item_id, bucket);
  }

  return {
    assignByDef,
    excludesByItem,
    categoriesById: new Map(allCategories.map((row) => [row.id, row])),
  };
};

export const isSpecVisibleAtItem = (
  categoryId: string,
  rootItemId: string,
  row: {
    assign_item_id: string | null;
    excluded_here: boolean;
    spec_def_id: string;
  },
  categoriesById: Map<string, ItemFlatRow>,
  excludesByItem: Map<string, Set<string>>,
): boolean => {
  const assignItemId = row.assign_item_id;

  if (!assignItemId) {
    return categoryId === rootItemId;
  }

  if (!isAncestorOrSelf(assignItemId, categoryId, categoriesById)) {
    return false;
  }

  if (
    hasExcludeOnAssignPath(
      assignItemId,
      categoryId,
      row.spec_def_id,
      excludesByItem,
      categoriesById,
    ) &&
    !row.excluded_here
  ) {
    return false;
  }

  return true;
};

export const buildSpecParticipation = (
  category: ItemDetailRow,
  defs: SpecDefinitionRow[],
  ctx: ParticipationContext,
): SpecParticipationRow => {
  const participation = {
    assignByDef: ctx.assignByDef,
    excludesByItem: ctx.excludesByItem,
  };
  const excludeHere = ctx.excludesByItem.get(category.id) ?? new Set<string>();

  const participates = defs.map((def) => {
    const assignItemId = ctx.assignByDef.get(def.id);
    const active = isEffectiveSpecDef(
      category.id,
      def.id,
      assignItemId,
      participation,
      ctx.categoriesById,
    );

    return {
      spec_def_id: def.id,
      display_name: def.display_name,
      value_type: def.value_type,
      active,
      assign_item_id: assignItemId ?? null,
      excluded_here: excludeHere.has(def.id),
      state: computeParticipationState(
        category.id,
        def.id,
        assignItemId,
        active,
        excludeHere.has(def.id),
        ctx.categoriesById,
        ctx.excludesByItem,
      ),
    };
  });

  return { participates };
};

export const loadItemSpecParticipation = async (
  pool: Pool,
  category: ItemDetailRow,
): Promise<SpecParticipationRow> => {
  const rootItemId = category.is_root ? category.id : category.root_item_id;
  if (!rootItemId) {
    return emptySpecParticipation();
  }

  const defs = await loadRootSpecDefinitions(pool, rootItemId);
  if (defs.length === 0) {
    return emptySpecParticipation();
  }

  const ctx = await loadParticipationContext(pool);
  return buildSpecParticipation(category, defs, ctx);
};

export const filterSpecsForItemVisibility = (
  categoryId: string,
  rootItemId: string,
  specDefinitions: SpecDefinitionRow[],
  participation: SpecParticipationRow,
  categoriesById: Map<string, ItemFlatRow>,
  excludesByItem: Map<string, Set<string>>,
): ItemDetailRelated => {
  const visibleParticipates = participation.participates.filter((row) =>
    isSpecVisibleAtItem(
      categoryId,
      rootItemId,
      row,
      categoriesById,
      excludesByItem,
    ),
  );
  const visibleDefIds = new Set(visibleParticipates.map((row) => row.spec_def_id));

  return {
    spec_definitions: specDefinitions.filter((def) => visibleDefIds.has(def.id)),
    spec_participation: { participates: visibleParticipates },
    item_labor_phase: [],
  };
};

export const loadItemLaborPhases = async (
  pool: Pool,
  itemId: string,
): Promise<ItemLaborPhaseRow[]> => {
  const result = await pool.query<ItemLaborPhaseRow>(
    `SELECT
       ilp.labor_phase_id,
       lp.name AS labor_phase_name,
       ilp.labor_rate_type_id,
       lrt.name AS labor_rate_type_name,
       ilp.hours_per_unit,
       ilp.sort_order
     FROM item_labor_phase ilp
     INNER JOIN labor_phase lp ON lp.id = ilp.labor_phase_id
     INNER JOIN labor_rate_type lrt ON lrt.id = ilp.labor_rate_type_id
     WHERE ilp.item_id = $1
     ORDER BY ilp.sort_order ASC, lp.name ASC`,
    [itemId],
  );
  return result.rows.map((row) => ({
    ...row,
    hours_per_unit: Number(row.hours_per_unit),
  }));
};

export const loadItemDetailRelated = async (
  pool: Pool,
  categoryId: string,
): Promise<ItemDetailRelated> => {
  const category = await loadItemDetail(pool, categoryId);
  if (!category) {
    return {
      item_labor_phase: [],
      spec_definitions: [],
      spec_participation: emptySpecParticipation(),
    };
  }

  const item_labor_phase = await loadItemLaborPhases(pool, categoryId);

  const rootItemId = category.is_root ? category.id : category.root_item_id;
  const allSpecDefinitions = rootItemId
    ? await loadRootSpecDefinitions(pool, rootItemId)
    : [];
  const ctx = await loadParticipationContext(pool);
  const spec_participation = buildSpecParticipation(category, allSpecDefinitions, ctx);

  if (!rootItemId) {
    return { item_labor_phase, spec_definitions: [], spec_participation };
  }

  return {
    ...filterSpecsForItemVisibility(
      categoryId,
      rootItemId,
      allSpecDefinitions,
      spec_participation,
      ctx.categoriesById,
      ctx.excludesByItem,
    ),
    item_labor_phase,
  };
};
