import type { Pool, PoolClient } from "pg";

import { tableExists } from "../../sites/repository/sql-utils";

export type JobCostSummary = {
  contract: number;
  budget: number;
  rebudgeted: number;
  committed: number;
  actual_material: number;
  margin_vs_budget: number;
  margin_vs_rebudgeted: number;
  margin_vs_actual: number;
};

const toNumber = (value: unknown): number => Number(value ?? 0);

const emptySummary = (): JobCostSummary => ({
  contract: 0,
  budget: 0,
  rebudgeted: 0,
  committed: 0,
  actual_material: 0,
  margin_vs_budget: 0,
  margin_vs_rebudgeted: 0,
  margin_vs_actual: 0,
});

/**
 * Job-level cost layers (task 45 C1). Contract / budget / re-budgeted from `job_line`;
 * committed / actual(material) roll up when procurement tables exist.
 */
export const loadJobCostSummary = async (
  pool: Pool | PoolClient,
  jobId: string,
): Promise<JobCostSummary> => {
  const lines = await pool.query<{
    quantity: string | number;
    unit_price: string | number;
    unit_cost: string | number;
  }>(
    `SELECT quantity, unit_price, unit_cost
     FROM job_line
     WHERE job_id = $1 AND status = 'active'`,
    [jobId],
  );

  let contract = 0;
  let budget = 0;
  for (const row of lines.rows) {
    const qty = toNumber(row.quantity);
    contract += qty * toNumber(row.unit_price);
    budget += qty * toNumber(row.unit_cost);
  }

  // Re-budgeted = current unit_cost × qty (unit_cost already reflects latest revision).
  // Equivalent to "latest revision else original" because revise updates job_line.unit_cost.
  const rebudgeted = budget;

  let committed = 0;
  if (
    (await tableExists(pool, "purchase_order_line")) &&
    (await tableExists(pool, "job_line_part"))
  ) {
    const committedResult = await pool.query<{ total: string | number }>(
      `SELECT COALESCE(SUM(pol.unit_cost * pol.quantity), 0) AS total
       FROM purchase_order_line pol
       INNER JOIN job_line_part jlp ON jlp.id = pol.job_line_part_id
       INNER JOIN job_line jl ON jl.id = jlp.job_line_id
       WHERE jl.job_id = $1
         AND jl.status = 'active'
         AND (
           NOT EXISTS (
             SELECT 1 FROM material_receipt_line mrl
             WHERE mrl.purchase_order_line_id = pol.id
           )
           OR COALESCE((
             SELECT SUM(mrl.quantity) FROM material_receipt_line mrl
             WHERE mrl.purchase_order_line_id = pol.id
           ), 0) < pol.quantity
         )`,
      [jobId],
    );
    committed = toNumber(committedResult.rows[0]?.total);
  }

  let actualMaterial = 0;
  if (await tableExists(pool, "material_receipt_line")) {
    const actualResult = await pool.query<{ total: string | number }>(
      `SELECT COALESCE(SUM(mrl.unit_cost * mrl.quantity), 0) AS total
       FROM material_receipt_line mrl
       INNER JOIN material_receipt mr ON mr.id = mrl.material_receipt_id
       WHERE mr.job_id = $1`,
      [jobId],
    );
    actualMaterial = toNumber(actualResult.rows[0]?.total);
  }

  return {
    contract,
    budget,
    rebudgeted,
    committed,
    actual_material: actualMaterial,
    margin_vs_budget: contract - budget,
    margin_vs_rebudgeted: contract - rebudgeted,
    margin_vs_actual: contract - actualMaterial,
  };
};

export const loadJobCostSummaryOrEmpty = async (
  pool: Pool | PoolClient,
  jobId: string,
): Promise<JobCostSummary> => {
  try {
    return await loadJobCostSummary(pool, jobId);
  } catch {
    return emptySummary();
  }
};
