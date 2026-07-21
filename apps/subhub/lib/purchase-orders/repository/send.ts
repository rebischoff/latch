import { randomUUID } from "node:crypto";

import { ConflictError, NotFoundError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { allocatePoNumberTx } from "./po-number";

/**
 * Send a draft PO: stamp po_number + order_date, flip header `sent`,
 * lines `ordered` with `ordered_at`, and create one default shipment per line.
 */
export const sendPurchaseOrderTx = async (
  client: PoolClient,
  purchaseOrderId: string,
): Promise<void> => {
  const poResult = await client.query<{
    id: string;
    status: string;
    po_number: string | null;
  }>(`SELECT id, status, po_number FROM purchase_order WHERE id = $1`, [
    purchaseOrderId,
  ]);
  const po = poResult.rows[0];
  if (!po) {
    throw new NotFoundError("Purchase order not found");
  }
  if (po.status !== "draft") {
    throw new ConflictError("Only draft purchase orders can be sent", {
      field: "status",
      code: "po_not_draft",
      status: po.status,
    });
  }

  const lines = await client.query<{ id: string; quantity: string | number }>(
    `SELECT id, quantity FROM purchase_order_line
     WHERE purchase_order_id = $1 AND status = 'draft'
     ORDER BY line_number ASC`,
    [purchaseOrderId],
  );
  if (lines.rows.length === 0) {
    throw new ValidationError("Cannot send a purchase order with no draft lines", {
      field: "line_items",
      code: "no_lines",
    });
  }

  const poNumber = po.po_number ?? (await allocatePoNumberTx(client));

  await client.query(
    `UPDATE purchase_order
     SET status = 'sent',
         po_number = $2,
         order_date = COALESCE(order_date, CURRENT_DATE),
         updated_at = now()
     WHERE id = $1`,
    [purchaseOrderId, poNumber],
  );

  for (const line of lines.rows) {
    await client.query(
      `UPDATE purchase_order_line
       SET status = 'ordered', ordered_at = now()
       WHERE id = $1`,
      [line.id],
    );

    const existingShipments = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM purchase_order_line_shipment
       WHERE purchase_order_line_id = $1`,
      [line.id],
    );
    if ((existingShipments.rows[0]?.count ?? 0) === 0) {
      await client.query(
        `INSERT INTO purchase_order_line_shipment (
           id, purchase_order_line_id, shipment_number, quantity, status, sort_order
         ) VALUES ($1, $2, 1, $3, 'scheduled', 0)`,
        [randomUUID(), line.id, line.quantity],
      );
    }
  }
};

export const sendPurchaseOrder = async (
  pool: Pool,
  actorId: string,
  purchaseOrderId: string,
): Promise<void> =>
  withPermissionDb(pool, actorId, (client) =>
    sendPurchaseOrderTx(client, purchaseOrderId),
  );
