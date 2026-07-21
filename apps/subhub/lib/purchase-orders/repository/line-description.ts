import { ConflictError, NotFoundError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

/**
 * IT6: PO line description is seeded (vendor → manufacturer → request text)
 * but purchaser-overridable while the PO is draft. This is the only write
 * path for that override.
 */
export const updatePurchaseOrderLineDescriptionTx = async (
  client: PoolClient,
  purchaseOrderId: string,
  lineId: string,
  description: string,
): Promise<void> => {
  const trimmed = description.trim();
  if (!trimmed) {
    throw new ValidationError("Description is required", {
      field: "description",
      code: "description_required",
    });
  }

  const result = await client.query<{
    id: string;
    status: string;
    po_status: string;
  }>(
    `SELECT pol.id, pol.status, po.status AS po_status
     FROM purchase_order_line pol
     INNER JOIN purchase_order po ON po.id = pol.purchase_order_id
     WHERE pol.id = $1 AND pol.purchase_order_id = $2`,
    [lineId, purchaseOrderId],
  );
  const line = result.rows[0];
  if (!line) {
    throw new NotFoundError("Purchase order line not found");
  }
  if (line.po_status !== "draft" || line.status !== "draft") {
    throw new ConflictError(
      "Purchase order line description can only be edited while draft",
      { field: "status", code: "line_not_draft", status: line.status },
    );
  }

  await client.query(
    `UPDATE purchase_order_line SET description = $1 WHERE id = $2`,
    [trimmed, lineId],
  );
  await client.query(
    `UPDATE purchase_order SET updated_at = now() WHERE id = $1`,
    [purchaseOrderId],
  );
};

export const updatePurchaseOrderLineDescription = async (
  pool: Pool,
  actorId: string,
  purchaseOrderId: string,
  lineId: string,
  description: string,
): Promise<void> =>
  withPermissionDb(pool, actorId, (client) =>
    updatePurchaseOrderLineDescriptionTx(
      client,
      purchaseOrderId,
      lineId,
      description,
    ),
  );
