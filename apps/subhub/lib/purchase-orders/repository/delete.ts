import { ConflictError, NotFoundError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { revertAllPendingSourcesTx } from "./revert-sources";

/** Draft-only discard: revert pending sources (PO2), then hard-delete header (CASCADE). */
export const deletePurchaseOrderTx = async (
  client: PoolClient,
  _actorId: string,
  purchaseOrderId: string,
): Promise<void> => {
  const poResult = await client.query<{ id: string; status: string }>(
    `SELECT id, status FROM purchase_order WHERE id = $1`,
    [purchaseOrderId],
  );
  const po = poResult.rows[0];
  if (!po) {
    throw new NotFoundError("Purchase order not found");
  }
  if (po.status !== "draft") {
    throw new ConflictError("Only draft purchase orders can be deleted — use cancel", {
      field: "status",
      code: "po_not_draft",
      status: po.status,
    });
  }

  const lines = await client.query<{ id: string }>(
    `SELECT id FROM purchase_order_line
     WHERE purchase_order_id = $1
     ORDER BY line_number ASC`,
    [purchaseOrderId],
  );

  for (const line of lines.rows) {
    await revertAllPendingSourcesTx(client, line.id);
  }

  await client.query(`DELETE FROM purchase_order WHERE id = $1`, [purchaseOrderId]);
};

export const deletePurchaseOrder = async (
  pool: Pool,
  actorId: string,
  purchaseOrderId: string,
): Promise<void> =>
  withPermissionDb(pool, actorId, (client) =>
    deletePurchaseOrderTx(client, actorId, purchaseOrderId),
  );
