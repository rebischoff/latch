import type { Pool, PoolClient } from "pg";

import type { EstimateLineItemPatchRow } from "../descriptors/estimate-detail";
import {
  computeAddOnUnit,
  computeUnitPriceTarget,
  loadCommercialCatalog,
  loadComplexityContext,
  resolveComplexityPercent,
  resolveRate,
  type CostAddOnProfile,
  type MarkupProfile,
} from "./estimate-commercial";
import { loadMergedBucketForLine } from "./estimate-bucket-specs";
import { resolveLineMaterial } from "./estimate-part-resolver";

export type RecalcLineInput = EstimateLineItemPatchRow & {
  id: string;
  is_new?: boolean;
  lock?: "line" | "none" | "sell";
};

export type RecalcLineOutput = RecalcLineInput & {
  unit_freight: number;
  unit_incidental: number;
  unit_material: number;
  unit_labor: number;
  unit_cost: number;
  unit_price_target: number;
};

const loadEstimateStatus = async (
  client: Pool | PoolClient,
  estimateScopeId: string,
): Promise<string | null> => {
  const result = await client.query<{ status: string }>(
    `SELECT e.status
     FROM estimate e
     INNER JOIN estimate_scope es ON es.estimate_id = e.id
     WHERE es.id = $1`,
    [estimateScopeId],
  );
  return result.rows[0]?.status ?? null;
};

export const recalcProductLine = async (
  client: Pool | PoolClient,
  line: RecalcLineInput,
  catalog?: Awaited<ReturnType<typeof loadCommercialCatalog>>,
): Promise<RecalcLineOutput> => {
  const commercialCatalog = catalog ?? (await loadCommercialCatalog(client));
  const lock = line.lock ?? "none";
  const status = await loadEstimateStatus(client, line.estimate_scope_id as string);

  if (status && status !== "draft") {
    return {
      ...line,
      unit_material: Number(line.unit_material ?? 0),
      unit_labor: Number(line.unit_labor ?? 0),
      unit_freight: Number(line.unit_freight ?? 0),
      unit_incidental: Number(line.unit_incidental ?? 0),
      unit_cost: Number(line.unit_cost ?? 0),
      unit_price_target: Number(line.unit_price_target ?? 0),
    };
  }

  if (lock === "line") {
    return {
      ...line,
      unit_material: Number(line.unit_material ?? 0),
      unit_labor: Number(line.unit_labor ?? 0),
      unit_freight: Number(line.unit_freight ?? 0),
      unit_incidental: Number(line.unit_incidental ?? 0),
      unit_cost: Number(line.unit_cost ?? 0),
      unit_price_target: Number(line.unit_price_target ?? 0),
    };
  }

  if (!line.item_id) {
    const unitCost = Number(line.unit_cost ?? 0);
    const unitPriceTarget = unitCost;
    const isNew = line.is_new ?? false;
    return {
      ...line,
      unit_material: Number(line.unit_material ?? 0),
      unit_labor: 0,
      unit_freight: 0,
      unit_incidental: 0,
      unit_cost: unitCost,
      unit_price_target: unitPriceTarget,
      unit_price:
        lock === "sell" ? line.unit_price : isNew ? unitPriceTarget : line.unit_price,
    };
  }

  const bucket = await loadMergedBucketForLine(
    client,
    line.estimate_scope_id as string,
    line.site_zone_id ?? null,
    line.is_new ? null : line.id,
  );

  const material = await resolveLineMaterial(
    client,
    {
      item_id: line.item_id,
      part_id: line.part_id ?? null,
      lock: line.lock ?? "none",
    },
    bucket,
    line.is_new ?? false,
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

  const baseLabor = (resolveRate(commercialCatalog, line.item_id, "labor") as number | null) ?? 0;
  const complexity = await loadComplexityContext(
    client,
    line.estimate_scope_id as string,
    line.site_zone_id ?? null,
  );
  const complexityPercent = resolveComplexityPercent(complexity);
  const unitLabor = baseLabor * (complexityPercent / 100);

  const unitCost = unitMaterial + unitLabor + unitFreight + unitIncidental;
  const markup = resolveRate(commercialCatalog, line.item_id, "markup") as MarkupProfile | null;
  const unitPriceTarget = computeUnitPriceTarget(
    unitMaterial,
    unitLabor,
    unitFreight,
    unitIncidental,
    markup,
  );

  const isNew = line.is_new ?? false;
  const unitPrice =
    lock === "sell"
      ? line.unit_price
      : isNew || lock === "none"
        ? unitPriceTarget
        : line.unit_price;

  return {
    ...line,
    part_id: material.part_id,
    lock: material.lock,
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
  existingLineIds: Set<string>,
): Promise<RecalcLineOutput[]> => {
  const catalog = await loadCommercialCatalog(client);
  const results: RecalcLineOutput[] = [];

  for (const line of lines) {
    const isNew = !existingLineIds.has(line.id);
    results.push(
      await recalcProductLine(client, {
        ...line,
        is_new: isNew,
      }, catalog),
    );
  }

  return results;
};
