import type { Pool } from "pg";

import { mergeLaborPhasesAcrossAncestry } from "../labor-phase-resolve";
import { tableExists } from "../../sites/repository/sql-utils";
import {
  loadAllItems,
  resolveRootItemId,
} from "./item-tree";

export type ItemDetailRow = {
  csi_code: string | null;
  fallback_unit_cost: number;
  freight_rate_type_id: string | null;
  has_children: boolean;
  id: string;
  in_use: boolean;
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
  display_name: string;
  id: string;
  sort_order: number;
};

export type SpecDefinitionRow = {
  decimal_places: number | null;
  display_name: string;
  id: string;
  in_use_part_count: number;
  options: SpecOptionRow[];
  sort_order: number;
  unit_id: string | null;
  unit_symbol: string | null;
  value_type: "boolean" | "enum" | "number";
};

export type ResolvedLaborPhaseRow = ItemLaborPhaseRow & {
  origin: "own" | "inherited";
  source_item_id: string | null;
  source_item_name: string | null;
};

export type ItemDetailRelated = {
  item_labor_phase: ItemLaborPhaseRow[];
  resolved_labor_phase: ResolvedLaborPhaseRow[];
  spec_definitions: SpecDefinitionRow[];
};

const loadItemHasChildren = async (pool: Pool, id: string): Promise<boolean> => {
  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM item WHERE parent_id = $1`,
    [id],
  );
  return (result.rows[0]?.count ?? 0) > 0;
};

const loadItemInUse = async (pool: Pool, id: string): Promise<boolean> => {
  if (await tableExists(pool, "estimate_line")) {
    const estimateResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM estimate_line WHERE item_id = $1`,
      [id],
    );
    if ((estimateResult.rows[0]?.count ?? 0) > 0) {
      return true;
    }
  }

  if (await tableExists(pool, "job_line")) {
    const jobResult = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM job_line WHERE item_id = $1`,
      [id],
    );
    if ((jobResult.rows[0]?.count ?? 0) > 0) {
      return true;
    }
  }

  return false;
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

  const [allRows, has_children, in_use] = await Promise.all([
    loadAllItems(pool),
    loadItemHasChildren(pool, id),
    loadItemInUse(pool, id),
  ]);
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
    has_children,
    in_use,
    incidental_rate_type_id: row.incidental_rate_type_id,
    markup_type_id: row.markup_type_id,
    is_root: row.parent_id === null,
    root_item_id: rootItemId,
    root_item_name: rootRow?.name ?? null,
  };
};

const emptySpecDefinitions = (): SpecDefinitionRow[] => [];

const loadSpecOptionsByDefIds = async (
  pool: Pool,
  specDefIds: string[],
): Promise<Map<string, SpecOptionRow[]>> => {
  if (specDefIds.length === 0) {
    return new Map();
  }

  const result = await pool.query<SpecOptionRow & { spec_def_id: string }>(
    `SELECT id, spec_def_id, display_name, sort_order
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
      display_name: row.display_name,
      sort_order: row.sort_order,
    });
    byDefId.set(row.spec_def_id, options);
  }

  return byDefId;
};

const loadSpecDefInUseCounts = async (
  pool: Pool,
  specDefId: string,
): Promise<{ parts: number }> => {
  const partResult = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM manufacturer_part_spec
     WHERE spec_def_id = $1`,
    [specDefId],
  );

  return {
    parts: partResult.rows[0]?.count ?? 0,
  };
};

export const loadScopeSpecDefinitions = async (
  pool: Pool,
  scopeRootId: string,
): Promise<SpecDefinitionRow[]> => {
  const defsResult = await pool.query<{
    decimal_places: number | null;
    display_name: string;
    id: string;
    sort_order: number;
    to_canonical_factor: number | null;
    unit_id: string | null;
    unit_symbol: string | null;
    value_type: "boolean" | "enum" | "number";
  }>(
    `SELECT
       sd.id,
       sd.display_name,
       sd.value_type,
       sd.unit_id,
       sd.decimal_places,
       sd.sort_order,
       su.symbol AS unit_symbol,
       su.to_canonical_factor
     FROM spec_def sd
     LEFT JOIN spec_unit su ON su.id = sd.unit_id
     WHERE sd.scope_root_item_id = $1
     ORDER BY sd.sort_order ASC, sd.display_name ASC, sd.id ASC`,
    [scopeRootId],
  );

  if (defsResult.rows.length === 0) {
    return [];
  }

  const defIds = defsResult.rows.map((row) => row.id);
  const optionsByDefId = await loadSpecOptionsByDefIds(pool, defIds);

  const rows: SpecDefinitionRow[] = [];
  for (const def of defsResult.rows) {
    const counts = await loadSpecDefInUseCounts(pool, def.id);
    rows.push({
      id: def.id,
      display_name: def.display_name,
      value_type: def.value_type,
      unit_id: def.unit_id,
      unit_symbol: def.unit_symbol,
      decimal_places: def.decimal_places,
      sort_order: def.sort_order,
      options: optionsByDefId.get(def.id) ?? [],
      in_use_part_count: counts.parts,
    });
  }

  return rows;
};

export const resolveResolvedLaborPhases = async (
  pool: Pool,
  itemId: string,
): Promise<ResolvedLaborPhaseRow[]> => {
  const allItems = await loadAllItems(pool);
  const itemsById = new Map(allItems.map((row) => [row.id, row]));

  const ancestryIds: string[] = [];
  let current: string | null = itemId;
  while (current) {
    ancestryIds.push(current);
    current = itemsById.get(current)?.parent_id ?? null;
  }

  const ancestry = await Promise.all(
    ancestryIds.map(async (id) => {
      const node = itemsById.get(id);
      return {
        itemId: id,
        itemName: node?.name ?? "",
        rows: await loadItemLaborPhases(pool, id),
      };
    }),
  );

  return mergeLaborPhasesAcrossAncestry(ancestry);
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
      resolved_labor_phase: [],
      spec_definitions: emptySpecDefinitions(),
    };
  }

  const [item_labor_phase, resolved_labor_phase] = await Promise.all([
    loadItemLaborPhases(pool, categoryId),
    resolveResolvedLaborPhases(pool, categoryId),
  ]);

  const spec_definitions =
    category.node_type === "scope"
      ? await loadScopeSpecDefinitions(pool, categoryId)
      : emptySpecDefinitions();

  return {
    item_labor_phase,
    resolved_labor_phase,
    spec_definitions,
  };
};
