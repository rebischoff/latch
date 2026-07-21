import { randomUUID } from "node:crypto";

import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

const toNumber = (value: unknown): number => Number(value ?? 0);

type SourceRow = {
  source_id: string;
  source_quantity: string | number;
  request_id: string;
  request_quantity: string | number;
  request_status: string;
  job_id: string;
  site_zone_id: string | null;
  job_line_part_id: string | null;
  part_id: string | null;
  description: string;
  unit: string;
  requested_by: string | null;
  requested_at: string;
};

/**
 * Free `qtyToFree` of still-`on_purchase_order` sources on a PO line (PO2).
 * Walks sources by `requested_at DESC` (latest first — the FCFS remainder).
 * Fulfilled sources are skipped. Partial frees split the backing request into
 * a reduced on-PO row + a new `open` clone for the freed qty.
 */
export const revertPendingSourcesForQtyTx = async (
  client: PoolClient,
  purchaseOrderLineId: string,
  qtyToFree: number,
): Promise<string[]> => {
  if (!(qtyToFree > 0)) {
    return [];
  }

  const result = await client.query<SourceRow>(
    `SELECT
       pols.id AS source_id,
       pols.quantity AS source_quantity,
       jmr.id AS request_id,
       jmr.quantity AS request_quantity,
       jmr.status AS request_status,
       jmr.job_id,
       jmr.site_zone_id,
       jmr.job_line_part_id,
       jmr.part_id,
       jmr.description,
       jmr.unit,
       jmr.requested_by,
       jmr.requested_at
     FROM purchase_order_line_source pols
     INNER JOIN job_material_request jmr ON jmr.id = pols.job_material_request_id
     WHERE pols.purchase_order_line_id = $1
       AND jmr.status = 'on_purchase_order'
     ORDER BY jmr.requested_at DESC, jmr.id DESC`,
    [purchaseOrderLineId],
  );

  let remaining = qtyToFree;
  const openedRequestIds: string[] = [];

  for (const row of result.rows) {
    if (remaining <= 1e-9) {
      break;
    }

    const sourceQty = toNumber(row.source_quantity);
    const take = Math.min(sourceQty, remaining);

    if (Math.abs(take - sourceQty) <= 1e-9) {
      await client.query(`DELETE FROM purchase_order_line_source WHERE id = $1`, [
        row.source_id,
      ]);
      await client.query(
        `UPDATE job_material_request
         SET status = 'open', updated_at = now()
         WHERE id = $1 AND status = 'on_purchase_order'`,
        [row.request_id],
      );
      openedRequestIds.push(row.request_id);
    } else {
      await client.query(
        `UPDATE purchase_order_line_source SET quantity = $1 WHERE id = $2`,
        [sourceQty - take, row.source_id],
      );
      await client.query(
        `UPDATE job_material_request
         SET quantity = $1, updated_at = now()
         WHERE id = $2`,
        [toNumber(row.request_quantity) - take, row.request_id],
      );

      const newRequestId = randomUUID();
      await client.query(
        `INSERT INTO job_material_request (
           id, job_id, site_zone_id, job_line_part_id, part_id,
           description, quantity, unit, status, requested_by, requested_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, $10)`,
        [
          newRequestId,
          row.job_id,
          row.site_zone_id,
          row.job_line_part_id,
          row.part_id,
          row.description,
          take,
          row.unit,
          row.requested_by,
          row.requested_at,
        ],
      );
      openedRequestIds.push(newRequestId);
    }

    remaining -= take;
  }

  if (remaining > 1e-9) {
    throw new ValidationError(
      "Not enough pending sources to free the requested quantity",
      {
        field: "sources",
        code: "insufficient_pending_sources",
        purchase_order_line_id: purchaseOrderLineId,
        qty_to_free: qtyToFree,
        shortfall: remaining,
      },
    );
  }

  return openedRequestIds;
};

/** Revert every still-`on_purchase_order` source on a line (full line cancel). */
export const revertAllPendingSourcesTx = async (
  client: PoolClient,
  purchaseOrderLineId: string,
): Promise<string[]> => {
  const result = await client.query<{ quantity: string | number }>(
    `SELECT COALESCE(SUM(pols.quantity), 0) AS quantity
     FROM purchase_order_line_source pols
     INNER JOIN job_material_request jmr ON jmr.id = pols.job_material_request_id
     WHERE pols.purchase_order_line_id = $1
       AND jmr.status = 'on_purchase_order'`,
    [purchaseOrderLineId],
  );
  const qty = toNumber(result.rows[0]?.quantity);
  if (!(qty > 0)) {
    return [];
  }
  return revertPendingSourcesForQtyTx(client, purchaseOrderLineId, qty);
};
