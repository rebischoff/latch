import type { Pool, PoolClient } from "pg";

import { tableExists } from "../../sites/repository/sql-utils";

const toNumber = (value: unknown): number => Number(value ?? 0);

/**
 * Job-wide remaining need for a single BOM row (task 63 / RP3).
 * `remaining = max(0, demand − PO coverage)`. Open `job_material_request`
 * rows no longer subtract — presence in the live pool already means "not on a PO."
 */
export const computeRemaining = (demand: number, covered: number): number =>
  Math.max(0, demand - covered);

export type BomPoolRow = {
  job_line_part_id: string;
  job_line_id: string;
  part_id: string | null;
  part_mpn: string | null;
  part_description: string | null;
  description: string;
  unit: string;
  demand: number;
  covered: number;
  remaining: number;
};

/**
 * @deprecated Prefer {@link loadPurchaseOrderCoverageForJob}. Open JMRs are not
 * coverage under RP3; kept for callers that still need status-aware open qty.
 * Returns qty on non-open requests only (`on_purchase_order` + `fulfilled`).
 */
export const loadRequisitionedCoverageForJob = async (
  client: Pool | PoolClient,
  jobId: string,
): Promise<Map<string, number>> => {
  if (!(await tableExists(client, "job_material_request"))) {
    return new Map();
  }

  const result = await client.query<{
    job_line_part_id: string;
    covered: string | number;
  }>(
    `SELECT job_line_part_id, SUM(quantity) AS covered
     FROM job_material_request
     WHERE job_id = $1
       AND job_line_part_id IS NOT NULL
       AND status IN ('on_purchase_order', 'fulfilled')
     GROUP BY job_line_part_id`,
    [jobId],
  );

  const coverage = new Map<string, number>();
  for (const row of result.rows) {
    coverage.set(row.job_line_part_id, toNumber(row.covered));
  }
  return coverage;
};

/**
 * PO coverage per `job_line_part_id` (RP3).
 * Sums active (non-cancelled) PO line source qty linked through backing JMRs,
 * plus any PO lines that still carry `job_line_part_id` directly.
 */
export const loadPurchaseOrderCoverageForJob = async (
  client: Pool | PoolClient,
  jobId: string,
): Promise<Map<string, number>> => {
  if (!(await tableExists(client, "purchase_order_line"))) {
    return new Map();
  }

  const coverage = new Map<string, number>();

  if (await tableExists(client, "purchase_order_line_source")) {
    const viaSources = await client.query<{
      job_line_part_id: string;
      covered: string | number;
    }>(
      `SELECT jmr.job_line_part_id, SUM(pols.quantity) AS covered
       FROM purchase_order_line_source pols
       INNER JOIN purchase_order_line pol ON pol.id = pols.purchase_order_line_id
       INNER JOIN purchase_order po ON po.id = pol.purchase_order_id
       INNER JOIN job_material_request jmr
         ON jmr.id = pols.job_material_request_id
       WHERE po.job_id = $1
         AND po.status <> 'cancelled'
         AND pol.status IS DISTINCT FROM 'cancelled'
         AND jmr.job_line_part_id IS NOT NULL
       GROUP BY jmr.job_line_part_id`,
      [jobId],
    );
    for (const row of viaSources.rows) {
      coverage.set(
        row.job_line_part_id,
        (coverage.get(row.job_line_part_id) ?? 0) + toNumber(row.covered),
      );
    }
  }

  const viaLine = await client.query<{
    job_line_part_id: string;
    covered: string | number;
  }>(
    `SELECT pol.job_line_part_id, SUM(pol.quantity) AS covered
     FROM purchase_order_line pol
     INNER JOIN purchase_order po ON po.id = pol.purchase_order_id
     WHERE po.job_id = $1
       AND po.status <> 'cancelled'
       AND pol.status IS DISTINCT FROM 'cancelled'
       AND pol.job_line_part_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM purchase_order_line_source pols
         WHERE pols.purchase_order_line_id = pol.id
       )
     GROUP BY pol.job_line_part_id`,
    [jobId],
  );
  for (const row of viaLine.rows) {
    coverage.set(
      row.job_line_part_id,
      (coverage.get(row.job_line_part_id) ?? 0) + toNumber(row.covered),
    );
  }

  return coverage;
};

/** All job BOM rows (`job_line_part`) with computed job-wide remaining need. */
export const loadBomRemainingForJob = async (
  pool: Pool,
  jobId: string,
): Promise<BomPoolRow[]> => {
  const result = await pool.query<{
    job_line_part_id: string;
    job_line_id: string;
    part_id: string | null;
    part_mpn: string | null;
    part_description: string | null;
    description: string;
    unit: string;
    quantity: string | number;
  }>(
    `SELECT
       jlp.id AS job_line_part_id,
       jlp.job_line_id,
       jlp.part_id,
       mp.mpn AS part_mpn,
       mp.description AS part_description,
       jlp.description,
       jlp.unit,
       jlp.quantity
     FROM job_line_part jlp
     INNER JOIN job_line jl ON jl.id = jlp.job_line_id
     LEFT JOIN manufacturer_part mp ON mp.id = jlp.part_id
     WHERE jl.job_id = $1
       AND jl.status = 'active'
     ORDER BY jl.sort_order ASC, jl.line_number ASC, jlp.sort_order ASC`,
    [jobId],
  );

  if (result.rows.length === 0) {
    return [];
  }

  const purchaseOrder = await loadPurchaseOrderCoverageForJob(pool, jobId);

  return result.rows.map((row) => {
    const demand = toNumber(row.quantity);
    const covered = purchaseOrder.get(row.job_line_part_id) ?? 0;
    return {
      job_line_part_id: row.job_line_part_id,
      job_line_id: row.job_line_id,
      part_id: row.part_id,
      part_mpn: row.part_mpn,
      part_description: row.part_description,
      description: row.description,
      unit: row.unit,
      demand,
      covered,
      remaining: computeRemaining(demand, covered),
    };
  });
};

/** BOM pool — rows still needing order (`remaining > 0`). */
export const loadBomPoolForJob = async (
  pool: Pool,
  jobId: string,
): Promise<BomPoolRow[]> => {
  const rows = await loadBomRemainingForJob(pool, jobId);
  return rows.filter((row) => row.remaining > 0);
};

/**
 * Job-wide remaining for one `job_line_part_id` (RP3: demand − PO only).
 * `excludeRequestId` is ignored — open requests are not coverage.
 */
export const loadRemainingForJobLinePart = async (
  client: Pool | PoolClient,
  args: { jobId: string; jobLinePartId: string; excludeRequestId?: string },
): Promise<number> => {
  const demandResult = await client.query<{ quantity: string | number }>(
    `SELECT jlp.quantity
     FROM job_line_part jlp
     INNER JOIN job_line jl ON jl.id = jlp.job_line_id
     WHERE jlp.id = $1 AND jl.job_id = $2`,
    [args.jobLinePartId, args.jobId],
  );
  const demand = toNumber(demandResult.rows[0]?.quantity);
  const poCoverage = await loadPurchaseOrderCoverageForJob(client, args.jobId);
  const covered = poCoverage.get(args.jobLinePartId) ?? 0;
  return computeRemaining(demand, covered);
};

/**
 * Thin rollup enum for a future Job BOM "Order" column.
 * Priority: fulfilled > on_purchase_order > requested > open.
 */
export type BomOrderStatus =
  | "open"
  | "requested"
  | "on_purchase_order"
  | "fulfilled";

export const computeBomOrderStatus = (args: {
  demand: number;
  openQty: number;
  onPurchaseOrderQty: number;
  fulfilledQty: number;
}): BomOrderStatus => {
  if (args.demand > 0 && args.fulfilledQty >= args.demand) {
    return "fulfilled";
  }
  if (args.onPurchaseOrderQty > 0) {
    return "on_purchase_order";
  }
  if (args.openQty > 0) {
    return "requested";
  }
  return "open";
};
