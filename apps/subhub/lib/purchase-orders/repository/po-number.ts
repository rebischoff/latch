import type { PoolClient } from "pg";

/**
 * Allocate the next `PO-NNNN` number (partial unique index on po_number).
 * Starts at PO-1001 when none exist yet.
 */
export const allocatePoNumberTx = async (client: PoolClient): Promise<string> => {
  const result = await client.query<{ po_number: string }>(
    `SELECT po_number
     FROM purchase_order
     WHERE po_number ~ '^PO-[0-9]+$'
     ORDER BY CAST(SUBSTRING(po_number FROM 4) AS INTEGER) DESC
     LIMIT 1
     FOR UPDATE`,
  );
  const last = result.rows[0]?.po_number;
  const next = last ? Number(last.slice(3)) + 1 : 1001;
  return `PO-${next}`;
};
