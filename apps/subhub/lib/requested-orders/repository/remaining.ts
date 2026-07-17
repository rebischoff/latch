import type { Pool, PoolClient } from "pg";

import { tableExists } from "../../sites/repository/sql-utils";

const toNumber = (value: unknown): number => Number(value ?? 0);

/**
 * Job-wide remaining need for a single BOM row (task 52 R3/R4).
 * `remaining = max(0, demand − covered)`. `covered` = requisitioned qty
 * (excl. withdrawn) across every requisition on the job, plus PO coverage —
 * PO coverage is a stub `0` until task 53 writes `purchase_order_line`.
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
 * Requisitioned coverage per `job_line_part_id`, job-wide, excluding `withdrawn`
 * lines. PO coverage is not added here — stub `0` until task 53.
 */
export const loadRequisitionedCoverageForJob = async (
  client: Pool | PoolClient,
  jobId: string,
): Promise<Map<string, number>> => {
  const result = await client.query<{ job_line_part_id: string; covered: string | number }>(
    `SELECT rol.job_line_part_id, SUM(rol.quantity) AS covered
     FROM requested_order_line rol
     INNER JOIN requested_order ro ON ro.id = rol.requested_order_id
     WHERE ro.job_id = $1
       AND rol.job_line_part_id IS NOT NULL
       AND rol.status <> 'withdrawn'
     GROUP BY rol.job_line_part_id`,
    [jobId],
  );

  const coverage = new Map<string, number>();
  for (const row of result.rows) {
    coverage.set(row.job_line_part_id, toNumber(row.covered));
  }
  return coverage;
};

/**
 * PO coverage per `job_line_part_id` — stub `0` until task 53 (`purchase_order_line`
 * writes land). Guarded with `tableExists` so it stays safe if the table is absent.
 */
export const loadPurchaseOrderCoverageForJob = async (
  client: Pool | PoolClient,
  _jobId: string,
): Promise<Map<string, number>> => {
  if (!(await tableExists(client, "purchase_order_line"))) {
    return new Map();
  }
  // task 53 writes purchase_order_line against requested_order_line / job_line_part;
  // no writer exists yet in task 52, so coverage is always empty (0) for now.
  return new Map();
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

  const [requisitioned, purchaseOrder] = await Promise.all([
    loadRequisitionedCoverageForJob(pool, jobId),
    loadPurchaseOrderCoverageForJob(pool, jobId),
  ]);

  return result.rows.map((row) => {
    const demand = toNumber(row.quantity);
    const covered =
      (requisitioned.get(row.job_line_part_id) ?? 0) +
      (purchaseOrder.get(row.job_line_part_id) ?? 0);
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

/** BOM pool for the requisition line picker — rows still needing order (`remaining > 0`). */
export const loadBomPoolForJob = async (
  pool: Pool,
  jobId: string,
): Promise<BomPoolRow[]> => {
  const rows = await loadBomRemainingForJob(pool, jobId);
  return rows.filter((row) => row.remaining > 0);
};

/**
 * Job-wide remaining for one `job_line_part_id`, optionally excluding one
 * requisition line's own current coverage (edit path — cap uses the
 * remaining that would exist if this line's own qty were released first).
 */
export const loadRemainingForJobLinePart = async (
  client: Pool | PoolClient,
  args: { jobId: string; jobLinePartId: string; excludeLineId?: string },
): Promise<number> => {
  const demandResult = await client.query<{ quantity: string | number }>(
    `SELECT jlp.quantity
     FROM job_line_part jlp
     INNER JOIN job_line jl ON jl.id = jlp.job_line_id
     WHERE jlp.id = $1 AND jl.job_id = $2`,
    [args.jobLinePartId, args.jobId],
  );
  const demand = toNumber(demandResult.rows[0]?.quantity);

  const coveredResult = await client.query<{ covered: string | number | null }>(
    `SELECT SUM(rol.quantity) AS covered
     FROM requested_order_line rol
     INNER JOIN requested_order ro ON ro.id = rol.requested_order_id
     WHERE ro.job_id = $1
       AND rol.job_line_part_id = $2
       AND rol.status <> 'withdrawn'
       AND ($3::text IS NULL OR rol.id <> $3)`,
    [args.jobId, args.jobLinePartId, args.excludeLineId ?? null],
  );
  const covered = toNumber(coveredResult.rows[0]?.covered);

  return computeRemaining(demand, covered);
};

/**
 * Thin rollup enum for a future Job BOM "Order" column — not wired to UI in
 * task 52. Priority: fulfilled > on_purchase_order > requested > withdrawn > open.
 */
export type BomOrderStatus =
  | "open"
  | "requested"
  | "on_purchase_order"
  | "fulfilled"
  | "withdrawn";

export const computeBomOrderStatus = (args: {
  demand: number;
  openQty: number;
  onPurchaseOrderQty: number;
  fulfilledQty: number;
  withdrawnQty: number;
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
  if (args.withdrawnQty > 0) {
    return "withdrawn";
  }
  return "open";
};
