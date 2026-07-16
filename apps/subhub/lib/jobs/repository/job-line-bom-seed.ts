import type { PoolClient } from "pg";

import { tableExists } from "../../sites/repository/sql-utils";

/**
 * Seed a job line's BOM (`job_line_part`) from its sold snapshot (part + cost).
 * Idempotent: no-op when the line already has parts. Shared by change-order add /
 * revise (task 45) and estimate win → job copy (task 46 W5).
 */
export const seedBomFromSoldLineTx = async (
  client: PoolClient,
  jobLineId: string,
): Promise<void> => {
  if (!(await tableExists(client, "job_line_part"))) {
    return;
  }

  const existing = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM job_line_part WHERE job_line_id = $1`,
    [jobLineId],
  );
  if ((existing.rows[0]?.count ?? 0) > 0) {
    return;
  }

  const line = await client.query<{
    part_id: string | null;
    vendor_part_id: string | null;
    description: string;
    quantity: string | number;
    unit: string;
    unit_cost: string | number;
  }>(
    `SELECT part_id, vendor_part_id, description, quantity, unit, unit_cost
     FROM job_line WHERE id = $1`,
    [jobLineId],
  );
  const sold = line.rows[0];
  if (!sold?.part_id) {
    return;
  }

  await client.query(
    `INSERT INTO job_line_part (
       job_line_id, part_id, vendor_part_id, description, quantity, unit, unit_cost, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
    [
      jobLineId,
      sold.part_id,
      sold.vendor_part_id,
      sold.description,
      sold.quantity,
      sold.unit,
      sold.unit_cost,
    ],
  );
};
