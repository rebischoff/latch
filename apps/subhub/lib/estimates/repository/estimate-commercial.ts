import type { Pool, PoolClient } from "pg";

import { tableExists } from "../../sites/repository/sql-utils";

export type ItemCommercialRow = {
  fallback_unit_cost: number;
  freight_rate_type_id: string | null;
  id: string;
  incidental_rate_type_id: string | null;
  markup_type_id: string | null;
  parent_id: string | null;
};

export type ItemLaborPhaseRow = {
  hours_per_unit: number;
  item_id: string;
  labor_phase_id: string;
  labor_rate_type_id: string;
  rate_cents: number;
};

export type CostAddOnProfile = {
  amount_cents: number;
  id: string;
  percent: number;
};

export type MarkupProfile = {
  id: string;
  labor_markup_percent: number;
  material_markup_percent: number;
};

export type ComplexityContext = {
  /** Nearest condition factor walking leaf → ancestor; null = 100%. */
  condition_factor_percent: number | null;
};

export type CommercialCatalog = {
  addOnById: Map<string, CostAddOnProfile>;
  itemsById: Map<string, ItemCommercialRow>;
  laborByItem: Map<string, ItemLaborPhaseRow[]>;
  markupById: Map<string, MarkupProfile>;
};

export const loadCommercialCatalog = async (
  client: Pool | PoolClient,
): Promise<CommercialCatalog> => {
  const [itemsResult, laborResult, addOnResult, markupResult] = await Promise.all([
    client.query<ItemCommercialRow>(
      `SELECT id, parent_id, freight_rate_type_id, incidental_rate_type_id,
              markup_type_id, COALESCE(fallback_unit_cost, 0) AS fallback_unit_cost
       FROM item`,
    ),
    client.query<ItemLaborPhaseRow>(
      `SELECT ilp.item_id, ilp.labor_phase_id, ilp.labor_rate_type_id,
              ilp.hours_per_unit, lrt.rate_cents
       FROM item_labor_phase ilp
       INNER JOIN labor_rate_type lrt ON lrt.id = ilp.labor_rate_type_id`,
    ),
    client.query<CostAddOnProfile>(
      `SELECT id, percent, amount_cents FROM cost_add_on_type`,
    ),
    client.query<MarkupProfile>(
      `SELECT id, material_markup_percent, labor_markup_percent FROM markup_type`,
    ),
  ]);

  const itemsById = new Map(itemsResult.rows.map((row) => [row.id, row]));

  const laborByItem = new Map<string, ItemLaborPhaseRow[]>();
  for (const row of laborResult.rows) {
    const rows = laborByItem.get(row.item_id) ?? [];
    rows.push(row);
    laborByItem.set(row.item_id, rows);
  }

  return {
    itemsById,
    laborByItem,
    addOnById: new Map(addOnResult.rows.map((row) => [row.id, row])),
    markupById: new Map(markupResult.rows.map((row) => [row.id, row])),
  };
};

const laborCostForRows = (rows: ItemLaborPhaseRow[]): number =>
  rows.reduce(
    (sum, row) => sum + Number(row.hours_per_unit) * Number(row.rate_cents) / 100,
    0,
  );

const laborCostForItem = (
  catalog: CommercialCatalog,
  itemId: string,
): number => laborCostForRows(catalog.laborByItem.get(itemId) ?? []);

const walkAncestry = (
  catalog: CommercialCatalog,
  itemId: string,
): string[] => {
  const path: string[] = [];
  let current: string | null = itemId;

  while (current) {
    path.push(current);
    current = catalog.itemsById.get(current)?.parent_id ?? null;
  }

  return path;
};

export type RateFamily =
  | "labor"
  | "freight"
  | "incidental"
  | "markup"
  | "material_rom";

export const resolveLaborGroup = (
  catalog: CommercialCatalog,
  itemId: string,
): ItemLaborPhaseRow[] => {
  const selfRows = catalog.laborByItem.get(itemId) ?? [];
  if (selfRows.length > 0) {
    return selfRows;
  }

  const path = walkAncestry(catalog, itemId);
  for (let index = 1; index < path.length; index += 1) {
    const ancestorId = path[index]!;
    const rows = catalog.laborByItem.get(ancestorId) ?? [];
    if (rows.length > 0) {
      return rows;
    }
  }

  return [];
};

/**
 * Resolve which labor phases count for a line.
 * - `null` / undefined = no explicit override in ancestry → all catalog phases
 * - `[]` = explicit empty (Y4 checked + empty) → no phases
 * - `[...]` = those phase ids
 */
export const resolveIncludedLaborPhaseIds = (
  explicitPhaseIds: string[] | null | undefined,
  laborGroup: ItemLaborPhaseRow[],
): Set<string> => {
  if (explicitPhaseIds === null || explicitPhaseIds === undefined) {
    return new Set(laborGroup.map((row) => row.labor_phase_id));
  }
  return new Set(explicitPhaseIds);
};

export const filterLaborGroupByInclusion = (
  laborGroup: ItemLaborPhaseRow[],
  includedPhaseIds: Set<string>,
): ItemLaborPhaseRow[] =>
  laborGroup.filter((row) => includedPhaseIds.has(row.labor_phase_id));

export const resolveFilteredLaborCost = (
  catalog: CommercialCatalog,
  itemId: string,
  explicitPhaseIds: string[] | null | undefined,
): number => {
  const laborGroup = resolveLaborGroup(catalog, itemId);
  const included = resolveIncludedLaborPhaseIds(explicitPhaseIds, laborGroup);
  return laborCostForRows(filterLaborGroupByInclusion(laborGroup, included));
};

const selfRate = (
  catalog: CommercialCatalog,
  itemId: string,
  family: RateFamily,
): number | CostAddOnProfile | MarkupProfile | null => {
  const item = catalog.itemsById.get(itemId);
  if (!item) {
    return null;
  }

  switch (family) {
    case "labor": {
      const cost = laborCostForItem(catalog, itemId);
      return cost > 0 ? cost : null;
    }
    case "freight":
      return item.freight_rate_type_id
        ? (catalog.addOnById.get(item.freight_rate_type_id) ?? null)
        : null;
    case "incidental":
      return item.incidental_rate_type_id
        ? (catalog.addOnById.get(item.incidental_rate_type_id) ?? null)
        : null;
    case "markup":
      return item.markup_type_id
        ? (catalog.markupById.get(item.markup_type_id) ?? null)
        : null;
    case "material_rom":
      return item.fallback_unit_cost > 0 ? item.fallback_unit_cost : null;
    default:
      return null;
  }
};

const ancestryFirst = (
  catalog: CommercialCatalog,
  itemId: string,
  family: RateFamily,
): number | CostAddOnProfile | MarkupProfile | null => {
  const path = walkAncestry(catalog, itemId);
  for (let index = 1; index < path.length; index += 1) {
    const ancestorId = path[index]!;
    const value = selfRate(catalog, ancestorId, family);
    if (value !== null) {
      return value;
    }
  }
  return null;
};

export const resolveRate = (
  catalog: CommercialCatalog,
  itemId: string,
  family: RateFamily,
): number | CostAddOnProfile | MarkupProfile | null =>
  selfRate(catalog, itemId, family) ?? ancestryFirst(catalog, itemId, family);

export const resolveComplexityPercent = (
  context: ComplexityContext,
): number => {
  if (context.condition_factor_percent !== null) {
    return context.condition_factor_percent;
  }
  return 100;
};

export const computeAddOnUnit = (
  profile: CostAddOnProfile | null,
  unitMaterial: number,
): number => {
  if (!profile) {
    return 0;
  }

  const percentPart = unitMaterial * (Number(profile.percent) / 100);
  const amountPart = profile.amount_cents / 100;
  return percentPart + amountPart;
};

export const computeUnitPriceTarget = (
  unitMaterial: number,
  unitLabor: number,
  unitFreight: number,
  unitIncidental: number,
  markup: MarkupProfile | null,
): number => {
  const materialSide = unitMaterial + unitFreight + unitIncidental;
  const laborSide = unitLabor;
  const materialMarkup = markup
    ? Number(markup.material_markup_percent)
    : 0;
  const laborMarkup = markup ? Number(markup.labor_markup_percent) : 0;

  return (
    materialSide * (1 + materialMarkup / 100) +
    laborSide * (1 + laborMarkup / 100)
  );
};

/**
 * First condition in leaf→root walk with `labor_phases_explicit` (Y3/Y4).
 * Returns `null` when no ancestor has an explicit set (use catalog default).
 * Returns `[]` when explicit empty (no phases).
 */
export const loadConditionLaborPhases = async (
  client: Pool | PoolClient,
  estimateConditionId: string,
): Promise<string[] | null> => {
  if (!(await tableExists(client, "estimate_condition_labor_phase"))) {
    return null;
  }

  let current: string | null = estimateConditionId;
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current)) {
      break;
    }
    seen.add(current);

    const metaResult: {
      rows: Array<{
        labor_phases_explicit: boolean;
        parent_condition_id: string | null;
      }>;
    } = await client.query(
      `SELECT labor_phases_explicit, parent_condition_id
       FROM estimate_condition
       WHERE id = $1`,
      [current],
    );
    const meta = metaResult.rows[0];
    if (!meta) {
      break;
    }

    if (meta.labor_phases_explicit) {
      const result = await client.query<{ labor_phase_id: string }>(
        `SELECT labor_phase_id
         FROM estimate_condition_labor_phase
         WHERE estimate_condition_id = $1
         ORDER BY sort_order ASC, labor_phase_id ASC`,
        [current],
      );
      return result.rows.map((row) => row.labor_phase_id);
    }

    current = meta.parent_condition_id;
  }

  return null;
};

/** @deprecated Scope labor phases removed in 37y — returns []. */
export const loadScopeLaborPhases = async (
  _client: Pool | PoolClient,
  _estimateScopeId: string,
): Promise<string[]> => [];

/** Nearest non-null complexity factor walking leaf → ancestor. */
export const loadComplexityContext = async (
  client: Pool | PoolClient,
  estimateConditionId: string | null,
): Promise<ComplexityContext> => {
  if (!estimateConditionId) {
    return { condition_factor_percent: null };
  }

  let current: string | null = estimateConditionId;
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current)) {
      break;
    }
    seen.add(current);

    const factorResult: {
      rows: Array<{
        factor_percent: number | null;
        parent_condition_id: string | null;
      }>;
    } = await client.query(
      `SELECT cf.factor_percent, ec.parent_condition_id
       FROM estimate_condition ec
       LEFT JOIN complexity_factor cf ON cf.id = ec.complexity_factor_id
       WHERE ec.id = $1`,
      [current],
    );

    const factorRow = factorResult.rows[0];
    if (!factorRow) {
      break;
    }

    if (factorRow.factor_percent !== null && factorRow.factor_percent !== undefined) {
      return { condition_factor_percent: Number(factorRow.factor_percent) };
    }

    current = factorRow.parent_condition_id;
  }

  return { condition_factor_percent: null };
};
