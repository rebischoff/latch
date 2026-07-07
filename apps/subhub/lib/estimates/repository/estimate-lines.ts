import type { Pool } from "pg";

import type { EstimateLineItemRow } from "../descriptors/estimate-detail";

const mapLineItemRow = (row: EstimateLineItemRow): EstimateLineItemRow => ({
  ...row,
  quantity: Number(row.quantity),
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
  lock: (row.lock ?? "none") as EstimateLineItemRow["lock"],
});

export const loadEstimateLineItems = async (
  pool: Pool,
  estimateId: string,
): Promise<EstimateLineItemRow[]> => {
  const result = await pool.query<EstimateLineItemRow>(
    `SELECT
       el.id,
       el.line_number,
       el.sort_order,
       el.line_role,
       el.description,
       el.quantity,
       el.unit,
       el.unit_cost,
       el.unit_price,
       el.unit_material,
       el.unit_labor,
       el.unit_freight,
       el.unit_incidental,
       el.unit_price_target,
       el.estimate_scope_id,
       el.site_zone_id,
       el.lock,
       el.phase_id,
       el.item_id,
       el.part_id,
       el.vendor_part_id,
       el.parent_line_id
     FROM estimate_line el
     WHERE el.estimate_id = $1
     ORDER BY el.sort_order ASC, el.line_number ASC, el.id ASC`,
    [estimateId],
  );

  return result.rows.map(mapLineItemRow);
};
