import { randomUUID } from "node:crypto";

import { ConflictError, NotFoundError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

const toNumber = (value: unknown): number => Number(value ?? 0);

export type SplitShipmentInput = {
  /** Quantity that ships now (near-ETA portion). Remainder becomes the backorder. */
  nearQuantity: number;
  nearEtaDate?: string | null;
  backorderEtaDate?: string | null;
};

export type SplitShipmentResult = {
  nearShipmentId: string;
  backorderShipmentId: string;
};

/**
 * Backorder = shipment split (task 53 Step 5). Takes the line's single open
 * `scheduled` shipment and splits it into near-ETA + backordered remainder.
 * No new schema.
 */
export const splitPurchaseOrderLineShipmentTx = async (
  client: PoolClient,
  purchaseOrderLineId: string,
  input: SplitShipmentInput,
): Promise<SplitShipmentResult> => {
  if (!(input.nearQuantity > 0)) {
    throw new ValidationError("nearQuantity must be > 0", {
      field: "nearQuantity",
      code: "invalid_quantity",
    });
  }

  const lineResult = await client.query<{
    id: string;
    status: string;
    quantity: string | number;
  }>(
    `SELECT id, status, quantity FROM purchase_order_line WHERE id = $1`,
    [purchaseOrderLineId],
  );
  const line = lineResult.rows[0];
  if (!line) {
    throw new NotFoundError("Purchase order line not found");
  }
  if (line.status === "cancelled" || line.status === "rejected") {
    throw new ConflictError("Cannot split shipments on a cancelled line", {
      field: "status",
      code: "line_cancelled",
    });
  }

  const shipments = await client.query<{
    id: string;
    shipment_number: number;
    quantity: string | number;
    status: string;
    eta_date: string | null;
  }>(
    `SELECT id, shipment_number, quantity, status, eta_date
     FROM purchase_order_line_shipment
     WHERE purchase_order_line_id = $1
     ORDER BY shipment_number ASC`,
    [purchaseOrderLineId],
  );

  const openScheduled = shipments.rows.filter(
    (s) => s.status === "scheduled" || s.status === "shipped" || s.status === "delivered",
  );
  // Prefer a single scheduled shipment to split (typical Send default).
  const target =
    shipments.rows.find((s) => s.status === "scheduled") ?? openScheduled[0];
  if (!target) {
    throw new ValidationError("No open shipment available to split", {
      field: "shipments",
      code: "no_open_shipment",
    });
  }
  if (target.status !== "scheduled") {
    throw new ConflictError("Only scheduled shipments can be split for backorder", {
      field: "status",
      code: "shipment_not_scheduled",
      status: target.status,
    });
  }

  const total = toNumber(target.quantity);
  if (input.nearQuantity >= total) {
    throw new ValidationError(
      "nearQuantity must be less than the shipment quantity",
      {
        field: "nearQuantity",
        code: "near_qty_too_large",
        shipment_quantity: total,
      },
    );
  }

  const backorderQty = total - input.nearQuantity;
  const maxNumber = shipments.rows.reduce(
    (max, s) => Math.max(max, s.shipment_number),
    0,
  );

  await client.query(
    `UPDATE purchase_order_line_shipment
     SET quantity = $1, eta_date = $2
     WHERE id = $3`,
    [input.nearQuantity, input.nearEtaDate ?? target.eta_date, target.id],
  );

  const backorderId = randomUUID();
  await client.query(
    `INSERT INTO purchase_order_line_shipment (
       id, purchase_order_line_id, shipment_number, quantity, eta_date, status, sort_order
     ) VALUES ($1, $2, $3, $4, $5, 'scheduled', $6)`,
    [
      backorderId,
      purchaseOrderLineId,
      maxNumber + 1,
      backorderQty,
      input.backorderEtaDate ?? null,
      maxNumber + 1,
    ],
  );

  return { nearShipmentId: target.id, backorderShipmentId: backorderId };
};

export const splitPurchaseOrderLineShipment = async (
  pool: Pool,
  actorId: string,
  purchaseOrderLineId: string,
  input: SplitShipmentInput,
): Promise<SplitShipmentResult> =>
  withPermissionDb(pool, actorId, (client) =>
    splitPurchaseOrderLineShipmentTx(client, purchaseOrderLineId, input),
  );
