import type { Pool } from "pg";

import type { EstimateLineItemRow } from "../descriptors/estimate-detail";

const mapLineItemRow = (row: EstimateLineItemRow): EstimateLineItemRow => ({
  ...row,
  quantity: Number(row.quantity),
  unit_cost: Number(row.unit_cost),
  unit_price: Number(row.unit_price),
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
       el.line_kind,
       el.description,
       el.quantity,
       el.unit,
       el.unit_cost,
       el.unit_price,
       el.estimate_section_id,
       el.site_location_id,
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
