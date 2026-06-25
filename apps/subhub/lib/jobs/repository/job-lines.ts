import type { Pool } from "pg";

import type { JobLineItemRow } from "../descriptors/job-detail";

const mapLineItemRow = (row: JobLineItemRow): JobLineItemRow => ({
  ...row,
  quantity: Number(row.quantity),
  unit_cost: Number(row.unit_cost),
  unit_price: Number(row.unit_price),
});

export const loadJobLineItems = async (
  pool: Pool,
  jobId: string,
): Promise<JobLineItemRow[]> => {
  const result = await pool.query<JobLineItemRow>(
    `SELECT
       jl.id,
       jl.line_number,
       jl.sort_order,
       jl.line_role,
       jl.line_kind,
       jl.description,
       jl.quantity,
       jl.unit,
       jl.unit_cost,
       jl.unit_price,
       jl.site_location_id,
       jl.phase_id,
       jl.item_id,
       jl.part_id,
       jl.vendor_part_id,
       jl.parent_line_id,
       jl.source,
       jl.status,
       jl.estimate_line_id,
       jl.change_order_line_id,
       jl.superseded_by_job_line_id
     FROM job_line jl
     WHERE jl.job_id = $1
     ORDER BY jl.sort_order ASC, jl.line_number ASC, jl.id ASC`,
    [jobId],
  );

  return result.rows.map(mapLineItemRow);
};
