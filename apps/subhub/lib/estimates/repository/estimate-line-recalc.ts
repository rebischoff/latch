import type { Pool, PoolClient } from "pg";

import type { EstimateLineItemPatchRow } from "../descriptors/estimate-detail";
import { loadMergedBucketForLine } from "./estimate-bucket-specs";
import { resolveLineMaterial } from "./estimate-part-resolver";

export type RecalcLineInput = EstimateLineItemPatchRow & {
  id: string;
  is_new?: boolean;
};

export type RecalcLineOutput = RecalcLineInput & {
  unit_material: number;
  unit_labor: number;
  unit_incidental: number;
  unit_cost: number;
  unit_price_target: number;
};

export const recalcProductLine = async (
  client: Pool | PoolClient,
  line: RecalcLineInput,
): Promise<RecalcLineOutput> => {
  if (line.line_kind !== "product" || !line.item_id) {
    const unitCost = Number(line.unit_cost ?? 0);
    return {
      ...line,
      unit_material: Number(line.unit_material ?? 0),
      unit_labor: 0,
      unit_incidental: 0,
      unit_cost: unitCost,
      unit_price_target: unitCost,
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
      part_locked: line.part_locked ?? false,
      material_status: line.material_status ?? null,
    },
    bucket,
    line.is_new ?? false,
  );

  const unitMaterial = material.unit_material;
  const unitLabor = 0;
  const unitIncidental = 0;
  const unitCost = unitMaterial + unitLabor + unitIncidental;
  const unitPriceTarget = unitCost;
  const isNew = line.is_new ?? false;

  return {
    ...line,
    part_id: material.part_id,
    part_locked: material.part_locked,
    material_status: material.material_status,
    vendor_part_id: material.vendor_part_id,
    unit_material: unitMaterial,
    unit_labor: unitLabor,
    unit_incidental: unitIncidental,
    unit_cost: unitCost,
    unit_price_target: unitPriceTarget,
    unit_price: isNew ? unitPriceTarget : line.unit_price,
  };
};

export const recalcLineItems = async (
  client: Pool | PoolClient,
  lines: RecalcLineInput[],
  existingLineIds: Set<string>,
): Promise<RecalcLineOutput[]> => {
  const results: RecalcLineOutput[] = [];

  for (const line of lines) {
    const isNew = !existingLineIds.has(line.id);
    results.push(
      await recalcProductLine(client, {
        ...line,
        is_new: isNew,
      }),
    );
  }

  return results;
};
