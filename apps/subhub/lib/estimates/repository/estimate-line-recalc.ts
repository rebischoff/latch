import type { Pool, PoolClient } from "pg";

import type { EstimateLineItemPatchRow } from "../descriptors/estimate-detail";
import {
  computeAddOnUnit,
  computeUnitPriceTarget,
  loadCommercialCatalog,
  loadComplexityContext,
  loadConditionLaborPhases,
  resolveComplexityPercent,
  resolveFilteredLaborCost,
  resolveRate,
  type ComplexityContext,
  type CostAddOnProfile,
  type MarkupProfile,
} from "./estimate-commercial";
import {
  loadMergedBucketForLine,
  type MergedBucketSpecs,
} from "./estimate-bucket-specs";
import { resolveLineMaterial } from "./estimate-part-resolver";
import { loadConditionIncludeDiscontinued } from "./estimate-part-picker";

export type RecalcLineInput = EstimateLineItemPatchRow & {
  id: string;
  is_new?: boolean;
  sales_locked?: boolean;
  material_locked?: boolean;
};

export type RecalcLineOutput = RecalcLineInput & {
  unit_freight: number;
  unit_incidental: number;
  unit_material: number;
  unit_labor: number;
  unit_cost: number;
  unit_price_target: number;
};

/** Optional overrides so preview can reuse save-path math without persisting draft config. */
export type RecalcContextOverrides = {
  bucket?: MergedBucketSpecs;
  complexity?: ComplexityContext;
  includeDiscontinued?: boolean;
  laborPhases?: string[] | null;
};

const loadEstimateStatus = async (
  client: Pool | PoolClient,
  estimateConditionId: string,
): Promise<string | null> => {
  const result = await client.query<{ status: string }>(
    `SELECT e.status
     FROM estimate e
     INNER JOIN estimate_condition ec ON ec.estimate_id = e.id
     WHERE ec.id = $1`,
    [estimateConditionId],
  );
  return result.rows[0]?.status ?? null;
};

const frozenSnapshots = (line: RecalcLineInput): RecalcLineOutput => ({
  ...line,
  unit_material: Number(line.unit_material ?? 0),
  unit_labor: Number(line.unit_labor ?? 0),
  unit_freight: Number(line.unit_freight ?? 0),
  unit_incidental: Number(line.unit_incidental ?? 0),
  unit_cost: Number(line.unit_cost ?? 0),
  unit_price_target: Number(line.unit_price_target ?? 0),
});

export const recalcProductLine = async (
  client: Pool | PoolClient,
  line: RecalcLineInput,
  catalog?: Awaited<ReturnType<typeof loadCommercialCatalog>>,
  overrides?: RecalcContextOverrides,
): Promise<RecalcLineOutput> => {
  const commercialCatalog = catalog ?? (await loadCommercialCatalog(client));
  const salesLocked = line.sales_locked ?? false;
  const materialLocked = line.material_locked ?? false;
  const status = await loadEstimateStatus(client, line.estimate_condition_id);

  if (status && status !== "draft") {
    return frozenSnapshots(line);
  }

  if (!line.item_id) {
    const unitCost = Number(line.unit_cost ?? 0);
    const unitPriceTarget = unitCost;
    return {
      ...line,
      sales_locked: salesLocked,
      material_locked: materialLocked,
      unit_material: Number(line.unit_material ?? 0),
      unit_labor: 0,
      unit_freight: 0,
      unit_incidental: 0,
      unit_cost: unitCost,
      unit_price_target: unitPriceTarget,
      unit_price: salesLocked ? line.unit_price : unitPriceTarget,
    };
  }

  const bucket =
    overrides?.bucket ??
    (await loadMergedBucketForLine(
      client,
      line.estimate_condition_id,
      line.is_new ? null : line.id,
    ));

  const material = await resolveLineMaterial(
    client,
    {
      item_id: line.item_id,
      part_id: line.part_id ?? null,
      material_locked: materialLocked,
    },
    bucket,
    line.is_new ?? false,
    overrides?.includeDiscontinued ??
      (await loadConditionIncludeDiscontinued(client, line.estimate_condition_id)),
  );

  const unitMaterial = material.unit_material;
  const freightProfile = resolveRate(
    commercialCatalog,
    line.item_id,
    "freight",
  ) as CostAddOnProfile | null;
  const incidentalProfile = resolveRate(
    commercialCatalog,
    line.item_id,
    "incidental",
  ) as CostAddOnProfile | null;
  const unitFreight = computeAddOnUnit(freightProfile, unitMaterial);
  const unitIncidental = computeAddOnUnit(incidentalProfile, unitMaterial);

  const [conditionLaborPhases, complexity] = await Promise.all([
    overrides?.laborPhases !== undefined
      ? Promise.resolve(overrides.laborPhases)
      : loadConditionLaborPhases(client, line.estimate_condition_id),
    overrides?.complexity
      ? Promise.resolve(overrides.complexity)
      : loadComplexityContext(client, line.estimate_condition_id),
  ]);
  const baseLabor = resolveFilteredLaborCost(
    commercialCatalog,
    line.item_id,
    conditionLaborPhases,
  );
  const complexityPercent = resolveComplexityPercent(complexity);
  const unitLabor = baseLabor * (complexityPercent / 100);

  const unitCost = unitMaterial + unitLabor + unitFreight + unitIncidental;
  const markup = resolveRate(
    commercialCatalog,
    line.item_id,
    "markup",
  ) as MarkupProfile | null;
  const unitPriceTarget = computeUnitPriceTarget(
    unitMaterial,
    unitLabor,
    unitFreight,
    unitIncidental,
    markup,
  );

  const unitPrice = salesLocked ? line.unit_price : unitPriceTarget;

  return {
    ...line,
    sales_locked: salesLocked,
    material_locked: materialLocked,
    // Material lock keeps form pin; otherwise adopt resolver suggestion.
    part_id: materialLocked ? (line.part_id ?? null) : material.part_id,
    item_id: line.item_id,
    vendor_part_id: material.vendor_part_id,
    unit_material: unitMaterial,
    unit_labor: unitLabor,
    unit_freight: unitFreight,
    unit_incidental: unitIncidental,
    unit_cost: unitCost,
    unit_price_target: unitPriceTarget,
    unit_price: unitPrice,
  };
};

export const recalcLineItems = async (
  client: Pool | PoolClient,
  lines: RecalcLineInput[],
  priorIds: Set<string>,
): Promise<RecalcLineOutput[]> => {
  const catalog = await loadCommercialCatalog(client);
  const out: RecalcLineOutput[] = [];

  for (const line of lines) {
    out.push(
      await recalcProductLine(
        client,
        { ...line, is_new: !priorIds.has(line.id) },
        catalog,
      ),
    );
  }

  return out;
};
