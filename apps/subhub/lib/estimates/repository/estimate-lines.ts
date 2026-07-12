import type { Pool } from "pg";

import type {
  EstimateLineAllocationRow,
  EstimateLineItemRow,
} from "../descriptors/estimate-detail";

type LineQueryRow = Omit<EstimateLineItemRow, "phase_id" | "allocations">;

const mapLineItemRow = (
  row: LineQueryRow,
  allocations: EstimateLineAllocationRow[],
): EstimateLineItemRow => ({
  ...row,
  allocations,
  phase_id: null,
  quantity: Number(row.quantity),
  qty_manual: Boolean(row.qty_manual),
  unit_cost: Number(row.unit_cost),
  unit_price: Number(row.unit_price),
  unit_material: Number(row.unit_material),
  unit_labor: Number(row.unit_labor),
  unit_freight: Number(row.unit_freight ?? 0),
  unit_incidental: Number(row.unit_incidental),
  unit_price_target:
    row.unit_price_target === null || row.unit_price_target === undefined
      ? null
      : Number(row.unit_price_target),
  sales_locked: Boolean(row.sales_locked),
  material_locked: Boolean(row.material_locked),
});

export const loadEstimateLineItems = async (
  pool: Pool,
  estimateId: string,
): Promise<EstimateLineItemRow[]> => {
  const result = await pool.query<LineQueryRow>(
    `SELECT
       el.id,
       el.line_number,
       el.sort_order,
       el.line_role,
       el.description,
       el.quantity,
       el.qty_manual,
       el.unit,
       el.unit_cost,
       el.unit_price,
       el.unit_material,
       el.unit_labor,
       el.unit_freight,
       el.unit_incidental,
       el.unit_price_target,
       el.estimate_condition_id,
       el.sales_locked,
       el.material_locked,
       el.item_id,
       el.part_id,
       el.vendor_part_id,
       el.parent_line_id
     FROM estimate_line el
     WHERE el.estimate_id = $1
     ORDER BY el.sort_order ASC, el.line_number ASC, el.id ASC`,
    [estimateId],
  );

  if (result.rows.length === 0) {
    return [];
  }

  const lineIds = result.rows.map((row) => row.id);
  const allocResult = await pool.query<{
    estimate_line_id: string;
    quantity: number;
    site_zone_id: string;
    site_zone_name: string | null;
  }>(
    `SELECT
       ela.estimate_line_id,
       ela.site_zone_id,
       ela.quantity,
       sz.name AS site_zone_name
     FROM estimate_line_allocation ela
     LEFT JOIN site_zone sz ON sz.id = ela.site_zone_id
     WHERE ela.estimate_line_id = ANY($1::text[])
     ORDER BY ela.site_zone_id ASC`,
    [lineIds],
  );

  const allocationsByLineId = new Map<string, EstimateLineAllocationRow[]>();
  for (const row of allocResult.rows) {
    const rows = allocationsByLineId.get(row.estimate_line_id) ?? [];
    rows.push({
      site_zone_id: row.site_zone_id,
      site_zone_name: row.site_zone_name,
      quantity: Number(row.quantity),
    });
    allocationsByLineId.set(row.estimate_line_id, rows);
  }

  return result.rows.map((row) =>
    mapLineItemRow(row, allocationsByLineId.get(row.id) ?? []),
  );
};
