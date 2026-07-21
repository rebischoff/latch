import { writeAudit } from "@latch/audit";
import { ConflictError, NotFoundError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import {
  revertAllPendingSourcesTx,
  revertPendingSourcesForQtyTx,
} from "./revert-sources";

const toNumber = (value: unknown): number => Number(value ?? 0);

export type CancelLevel = "header" | "line" | "shipment";

export type CancelPurchaseOrderInput = {
  level: CancelLevel;
  /** Required for level=line */
  purchaseOrderLineId?: string;
  /** Required for level=shipment */
  purchaseOrderLineShipmentId?: string;
};

export type CancelPurchaseOrderResult = {
  warningLevel: "plain" | "strong";
  openedRequestIds: string[];
};

const TERMINAL_LINE = new Set(["received", "cancelled", "rejected"]);
const TERMINAL_SHIPMENT = new Set(["received", "cancelled"]);
const STRONG_SHIPMENT = new Set(["shipped", "delivered"]);

const auditCancel = async (args: {
  actorId: string;
  tableName: string;
  recordId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  patch?: Record<string, unknown>;
}): Promise<void> => {
  await writeAudit({
    actorId: args.actorId,
    action: "update",
    tableName: args.tableName,
    recordId: args.recordId,
    moduleId: "purchase_order_detail",
    fieldIds: ["profile"],
    before: args.before,
    after: args.after,
    patch: args.patch ?? null,
  });
};

const shipmentNeedsStrongWarning = async (
  client: PoolClient,
  lineIds: string[],
): Promise<boolean> => {
  if (lineIds.length === 0) {
    return false;
  }
  const result = await client.query<{ status: string }>(
    `SELECT status FROM purchase_order_line_shipment
     WHERE purchase_order_line_id = ANY($1::text[])
       AND status = ANY($2::text[])`,
    [lineIds, [...STRONG_SHIPMENT]],
  );
  return result.rows.length > 0;
};

const cancelShipmentsForLineTx = async (
  client: PoolClient,
  actorId: string,
  lineId: string,
): Promise<void> => {
  const shipments = await client.query<{
    id: string;
    status: string;
    quantity: string | number;
  }>(
    `SELECT id, status, quantity FROM purchase_order_line_shipment
     WHERE purchase_order_line_id = $1`,
    [lineId],
  );
  for (const shipment of shipments.rows) {
    if (TERMINAL_SHIPMENT.has(shipment.status)) {
      continue;
    }
    await client.query(
      `UPDATE purchase_order_line_shipment SET status = 'cancelled' WHERE id = $1`,
      [shipment.id],
    );
    await auditCancel({
      actorId,
      tableName: "purchase_order_line_shipment",
      recordId: shipment.id,
      before: { status: shipment.status },
      after: { status: "cancelled" },
      patch: { purchase_order_line_id: lineId },
    });
  }
};

/**
 * Cancel one not-yet-received line: cancel open shipments, revert pending sources,
 * mark line cancelled. Fulfilled sources untouched (PO2).
 */
export const cancelPurchaseOrderLineTx = async (
  client: PoolClient,
  actorId: string,
  lineId: string,
): Promise<string[]> => {
  const lineResult = await client.query<{
    id: string;
    purchase_order_id: string;
    status: string;
    quantity: string | number;
  }>(
    `SELECT id, purchase_order_id, status, quantity
     FROM purchase_order_line WHERE id = $1`,
    [lineId],
  );
  const line = lineResult.rows[0];
  if (!line) {
    throw new NotFoundError("Purchase order line not found");
  }
  if (line.status === "received") {
    throw new ConflictError("Fully received lines cannot be cancelled (use RMA)", {
      field: "status",
      code: "line_received",
      id: lineId,
    });
  }
  if (line.status === "cancelled" || line.status === "rejected") {
    return [];
  }

  await cancelShipmentsForLineTx(client, actorId, lineId);
  const opened = await revertAllPendingSourcesTx(client, lineId);

  await client.query(
    `UPDATE purchase_order_line SET status = 'cancelled' WHERE id = $1`,
    [lineId],
  );
  await auditCancel({
    actorId,
    tableName: "purchase_order_line",
    recordId: lineId,
    before: { status: line.status },
    after: { status: "cancelled" },
    patch: { purchase_order_id: line.purchase_order_id },
  });

  return opened;
};

/**
 * Shipment-level cancel (PO3): cancel one shipment, free that qty of pending
 * sources, reduce line quantity. Leaves other shipments untouched.
 */
export const cancelPurchaseOrderShipmentTx = async (
  client: PoolClient,
  actorId: string,
  shipmentId: string,
): Promise<string[]> => {
  const shipmentResult = await client.query<{
    id: string;
    purchase_order_line_id: string;
    status: string;
    quantity: string | number;
  }>(
    `SELECT id, purchase_order_line_id, status, quantity
     FROM purchase_order_line_shipment WHERE id = $1`,
    [shipmentId],
  );
  const shipment = shipmentResult.rows[0];
  if (!shipment) {
    throw new NotFoundError("Purchase order shipment not found");
  }
  if (shipment.status === "received") {
    throw new ConflictError("Received shipments cannot be cancelled", {
      field: "status",
      code: "shipment_received",
      id: shipmentId,
    });
  }
  if (shipment.status === "cancelled") {
    return [];
  }

  const lineResult = await client.query<{
    id: string;
    purchase_order_id: string;
    status: string;
    quantity: string | number;
  }>(
    `SELECT id, purchase_order_id, status, quantity
     FROM purchase_order_line WHERE id = $1`,
    [shipment.purchase_order_line_id],
  );
  const line = lineResult.rows[0];
  if (!line) {
    throw new NotFoundError("Purchase order line not found");
  }
  if (line.status === "received") {
    throw new ConflictError("Fully received lines cannot be cancelled", {
      field: "status",
      code: "line_received",
      id: line.id,
    });
  }

  const qty = toNumber(shipment.quantity);
  const opened = await revertPendingSourcesForQtyTx(
    client,
    shipment.purchase_order_line_id,
    qty,
  );

  await client.query(
    `UPDATE purchase_order_line_shipment SET status = 'cancelled' WHERE id = $1`,
    [shipmentId],
  );
  await auditCancel({
    actorId,
    tableName: "purchase_order_line_shipment",
    recordId: shipmentId,
    before: { status: shipment.status },
    after: { status: "cancelled" },
    patch: { purchase_order_line_id: line.id },
  });

  const newLineQty = Math.max(0, toNumber(line.quantity) - qty);
  if (newLineQty <= 1e-9) {
    await client.query(
      `UPDATE purchase_order_line SET status = 'cancelled', quantity = 0 WHERE id = $1`,
      [line.id],
    );
    await auditCancel({
      actorId,
      tableName: "purchase_order_line",
      recordId: line.id,
      before: { status: line.status, quantity: toNumber(line.quantity) },
      after: { status: "cancelled", quantity: 0 },
    });
  } else {
    await client.query(
      `UPDATE purchase_order_line SET quantity = $1 WHERE id = $2`,
      [newLineQty, line.id],
    );
  }

  return opened;
};

/** Header cancel = cascade line cancel to every not-yet-resolved line (PO3). */
export const cancelPurchaseOrderHeaderTx = async (
  client: PoolClient,
  actorId: string,
  purchaseOrderId: string,
): Promise<string[]> => {
  const poResult = await client.query<{ id: string; status: string }>(
    `SELECT id, status FROM purchase_order WHERE id = $1`,
    [purchaseOrderId],
  );
  const po = poResult.rows[0];
  if (!po) {
    throw new NotFoundError("Purchase order not found");
  }
  if (po.status === "cancelled") {
    return [];
  }
  if (po.status === "received") {
    throw new ConflictError("Fully received purchase orders cannot be cancelled", {
      field: "status",
      code: "po_received",
      id: purchaseOrderId,
    });
  }

  const lines = await client.query<{ id: string; status: string }>(
    `SELECT id, status FROM purchase_order_line
     WHERE purchase_order_id = $1
     ORDER BY line_number ASC`,
    [purchaseOrderId],
  );

  const opened: string[] = [];
  for (const line of lines.rows) {
    if (TERMINAL_LINE.has(line.status)) {
      continue;
    }
    const ids = await cancelPurchaseOrderLineTx(client, actorId, line.id);
    opened.push(...ids);
  }

  await client.query(
    `UPDATE purchase_order
     SET status = 'cancelled', updated_at = now()
     WHERE id = $1`,
    [purchaseOrderId],
  );
  await auditCancel({
    actorId,
    tableName: "purchase_order",
    recordId: purchaseOrderId,
    before: { status: po.status },
    after: { status: "cancelled" },
  });

  return opened;
};

export const cancelPurchaseOrderTx = async (
  client: PoolClient,
  actorId: string,
  purchaseOrderId: string,
  input: CancelPurchaseOrderInput,
): Promise<CancelPurchaseOrderResult> => {
  let openedRequestIds: string[] = [];
  let lineIdsForWarning: string[] = [];

  if (input.level === "header") {
    const lines = await client.query<{ id: string }>(
      `SELECT id FROM purchase_order_line WHERE purchase_order_id = $1`,
      [purchaseOrderId],
    );
    lineIdsForWarning = lines.rows.map((r) => r.id);
    openedRequestIds = await cancelPurchaseOrderHeaderTx(
      client,
      actorId,
      purchaseOrderId,
    );
  } else if (input.level === "line") {
    if (!input.purchaseOrderLineId) {
      throw new ValidationError("purchaseOrderLineId is required for line cancel", {
        field: "purchaseOrderLineId",
        code: "required",
      });
    }
    const owned = await client.query<{ id: string }>(
      `SELECT id FROM purchase_order_line
       WHERE id = $1 AND purchase_order_id = $2`,
      [input.purchaseOrderLineId, purchaseOrderId],
    );
    if (!owned.rows[0]) {
      throw new ValidationError("Line does not belong to this purchase order", {
        field: "purchaseOrderLineId",
        code: "line_not_on_po",
      });
    }
    lineIdsForWarning = [input.purchaseOrderLineId];
    openedRequestIds = await cancelPurchaseOrderLineTx(
      client,
      actorId,
      input.purchaseOrderLineId,
    );
  } else if (input.level === "shipment") {
    if (!input.purchaseOrderLineShipmentId) {
      throw new ValidationError(
        "purchaseOrderLineShipmentId is required for shipment cancel",
        { field: "purchaseOrderLineShipmentId", code: "required" },
      );
    }
    const owned = await client.query<{
      id: string;
      purchase_order_line_id: string;
      status: string;
    }>(
      `SELECT pols.id, pols.purchase_order_line_id, pols.status
       FROM purchase_order_line_shipment pols
       INNER JOIN purchase_order_line pol ON pol.id = pols.purchase_order_line_id
       WHERE pols.id = $1 AND pol.purchase_order_id = $2`,
      [input.purchaseOrderLineShipmentId, purchaseOrderId],
    );
    const shipment = owned.rows[0];
    if (!shipment) {
      throw new ValidationError("Shipment does not belong to this purchase order", {
        field: "purchaseOrderLineShipmentId",
        code: "shipment_not_on_po",
      });
    }
    lineIdsForWarning = [shipment.purchase_order_line_id];
    const strong =
      STRONG_SHIPMENT.has(shipment.status) ||
      (await shipmentNeedsStrongWarning(client, lineIdsForWarning));
    openedRequestIds = await cancelPurchaseOrderShipmentTx(
      client,
      actorId,
      input.purchaseOrderLineShipmentId,
    );
    return {
      warningLevel: strong ? "strong" : "plain",
      openedRequestIds,
    };
  } else {
    throw new ValidationError("Invalid cancel level", {
      field: "level",
      code: "invalid_level",
    });
  }

  const strong = await shipmentNeedsStrongWarning(client, lineIdsForWarning);
  return {
    warningLevel: strong ? "strong" : "plain",
    openedRequestIds,
  };
};

/**
 * Preview cancel warning level without mutating (for PO4 confirm UI).
 * Call before showing confirm; actual cancel still runs cancelPurchaseOrder.
 */
export const previewCancelWarningTx = async (
  client: PoolClient,
  purchaseOrderId: string,
  input: CancelPurchaseOrderInput,
): Promise<"plain" | "strong" | "blocked"> => {
  if (input.level === "header") {
    const po = await client.query<{ status: string }>(
      `SELECT status FROM purchase_order WHERE id = $1`,
      [purchaseOrderId],
    );
    if (po.rows[0]?.status === "received") {
      return "blocked";
    }
    const lines = await client.query<{ id: string }>(
      `SELECT id FROM purchase_order_line
       WHERE purchase_order_id = $1
         AND status NOT IN ('cancelled', 'rejected', 'received')`,
      [purchaseOrderId],
    );
    const strong = await shipmentNeedsStrongWarning(
      client,
      lines.rows.map((r) => r.id),
    );
    return strong ? "strong" : "plain";
  }

  if (input.level === "line" && input.purchaseOrderLineId) {
    const line = await client.query<{ status: string }>(
      `SELECT status FROM purchase_order_line WHERE id = $1`,
      [input.purchaseOrderLineId],
    );
    if (line.rows[0]?.status === "received") {
      return "blocked";
    }
    const strong = await shipmentNeedsStrongWarning(client, [
      input.purchaseOrderLineId,
    ]);
    return strong ? "strong" : "plain";
  }

  if (input.level === "shipment" && input.purchaseOrderLineShipmentId) {
    const shipment = await client.query<{ status: string }>(
      `SELECT status FROM purchase_order_line_shipment WHERE id = $1`,
      [input.purchaseOrderLineShipmentId],
    );
    const status = shipment.rows[0]?.status;
    if (status === "received") {
      return "blocked";
    }
    if (status && STRONG_SHIPMENT.has(status)) {
      return "strong";
    }
    return "plain";
  }

  return "plain";
};

export const cancelPurchaseOrder = async (
  pool: Pool,
  actorId: string,
  purchaseOrderId: string,
  input: CancelPurchaseOrderInput,
): Promise<CancelPurchaseOrderResult> =>
  withPermissionDb(pool, actorId, (client) =>
    cancelPurchaseOrderTx(client, actorId, purchaseOrderId, input),
  );

export const previewCancelWarning = async (
  pool: Pool,
  actorId: string,
  purchaseOrderId: string,
  input: CancelPurchaseOrderInput,
): Promise<"plain" | "strong" | "blocked"> =>
  withPermissionDb(pool, actorId, (client) =>
    previewCancelWarningTx(client, purchaseOrderId, input),
  );
