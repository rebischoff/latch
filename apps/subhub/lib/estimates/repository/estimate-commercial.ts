import type { Pool, PoolClient } from "pg";

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
  scope_factor_percent: number | null;
  zone_factor_percent: number | null;
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

const laborCostForItem = (
  catalog: CommercialCatalog,
  itemId: string,
): number => {
  const rows = catalog.laborByItem.get(itemId) ?? [];
  return rows.reduce(
    (sum, row) => sum + Number(row.hours_per_unit) * Number(row.rate_cents) / 100,
    0,
  );
};

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
  if (context.zone_factor_percent !== null) {
    return context.zone_factor_percent;
  }
  if (context.scope_factor_percent !== null) {
    return context.scope_factor_percent;
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

export const loadComplexityContext = async (
  client: Pool | PoolClient,
  estimateScopeId: string,
  siteZoneId: string | null,
): Promise<ComplexityContext> => {
  const scopeResult = await client.query<{ factor_percent: number | null }>(
    `SELECT cf.factor_percent
     FROM estimate_scope es
     LEFT JOIN complexity_factor cf ON cf.id = es.complexity_factor_id
     WHERE es.id = $1`,
    [estimateScopeId],
  );

  let zoneFactor: number | null = null;
  if (siteZoneId) {
    const zoneResult = await client.query<{ factor_percent: number | null }>(
      `SELECT cf.factor_percent
       FROM estimate_zone ez
       LEFT JOIN complexity_factor cf ON cf.id = ez.complexity_factor_id
       WHERE ez.site_zone_id = $1 AND ez.estimate_scope_id = $2`,
      [siteZoneId, estimateScopeId],
    );
    zoneFactor =
      zoneResult.rows[0]?.factor_percent === null ||
      zoneResult.rows[0]?.factor_percent === undefined
        ? null
        : Number(zoneResult.rows[0].factor_percent);
  }

  const scopeFactor =
    scopeResult.rows[0]?.factor_percent === null ||
    scopeResult.rows[0]?.factor_percent === undefined
      ? null
      : Number(scopeResult.rows[0].factor_percent);

  return {
    scope_factor_percent: scopeFactor,
    zone_factor_percent: zoneFactor,
  };
};
