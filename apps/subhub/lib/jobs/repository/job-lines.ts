import type { Pool } from "pg";

import { tableExists } from "@/lib/sites/repository/sql-utils";

import type {
  JobLineAllocationRow,
  JobLineItemRow,
} from "../descriptors/job-detail";

type LineQueryRow = Omit<JobLineItemRow, "allocations">;

const num = (value: unknown): number => Number(value ?? 0);

const mapLineItemRow = (
  row: LineQueryRow,
  allocations: JobLineAllocationRow[],
): JobLineItemRow => ({
  ...row,
  allocations,
  quantity: num(row.quantity),
  sold_quantity: num(row.sold_quantity),
  qty_manual: Boolean(row.qty_manual),
  unit_cost: num(row.unit_cost),
  unit_price: num(row.unit_price),
  unit_material: num(row.unit_material),
  unit_labor: num(row.unit_labor),
  unit_freight: num(row.unit_freight),
  unit_incidental: num(row.unit_incidental),
  unit_price_target:
    row.unit_price_target === null || row.unit_price_target === undefined
      ? null
      : num(row.unit_price_target),
  sold_unit_price: num(row.sold_unit_price),
  sold_unit_cost: num(row.sold_unit_cost),
  sold_unit_material: num(row.sold_unit_material),
  sold_unit_labor: num(row.sold_unit_labor),
  sold_unit_freight: num(row.sold_unit_freight),
  sold_unit_incidental: num(row.sold_unit_incidental),
  sales_locked: Boolean(row.sales_locked),
  material_locked: Boolean(row.material_locked),
  item_name: row.item_name ?? null,
  part_mpn: row.part_mpn ?? null,
});

export const loadJobLineItems = async (
  pool: Pool,
  jobId: string,
): Promise<JobLineItemRow[]> => {
  const result = await pool.query<LineQueryRow>(
    `SELECT
       jl.id,
       jl.line_number,
       jl.sort_order,
       jl.line_role,
       jl.line_kind,
       jl.description,
       jl.quantity,
       jl.sold_quantity,
       jl.qty_manual,
       jl.unit,
       jl.unit_cost,
       jl.unit_price,
       jl.unit_material,
       jl.unit_labor,
       jl.unit_freight,
       jl.unit_incidental,
       jl.unit_price_target,
       jl.sold_unit_price,
       jl.sold_unit_cost,
       jl.sold_unit_material,
       jl.sold_unit_labor,
       jl.sold_unit_freight,
       jl.sold_unit_incidental,
       jl.sales_locked,
       jl.material_locked,
       jl.job_condition_id,
       jl.site_zone_id,
       jl.site_asset_id,
       jl.item_id,
       i.name AS item_name,
       jl.part_id,
       mp.mpn AS part_mpn,
       jl.vendor_part_id,
       jl.parent_line_id,
       jl.source,
       jl.status,
       jl.estimate_line_id,
       jl.change_order_line_id,
       jl.superseded_by_job_line_id
     FROM job_line jl
     LEFT JOIN item i ON i.id = jl.item_id
     LEFT JOIN manufacturer_part mp ON mp.id = jl.part_id
     WHERE jl.job_id = $1
       AND jl.status = 'active'
     ORDER BY jl.sort_order ASC, jl.line_number ASC, jl.id ASC`,
    [jobId],
  );

  if (result.rows.length === 0) {
    return [];
  }

  const allocationsByLineId = new Map<string, JobLineAllocationRow[]>();
  if (await tableExists(pool, "job_line_allocation")) {
    const lineIds = result.rows.map((row) => row.id);
    const allocResult = await pool.query<{
      job_line_id: string;
      quantity: number;
      site_zone_id: string;
      site_zone_name: string | null;
    }>(
      `SELECT
         jla.job_line_id,
         jla.site_zone_id,
         jla.quantity,
         sz.name AS site_zone_name
       FROM job_line_allocation jla
       LEFT JOIN site_zone sz ON sz.id = jla.site_zone_id
       WHERE jla.job_line_id = ANY($1::text[])
       ORDER BY jla.site_zone_id ASC`,
      [lineIds],
    );

    for (const row of allocResult.rows) {
      const rows = allocationsByLineId.get(row.job_line_id) ?? [];
      rows.push({
        site_zone_id: row.site_zone_id,
        site_zone_name: row.site_zone_name,
        quantity: num(row.quantity),
      });
      allocationsByLineId.set(row.job_line_id, rows);
    }
  }

  return result.rows.map((row) =>
    mapLineItemRow(row, allocationsByLineId.get(row.id) ?? []),
  );
};
