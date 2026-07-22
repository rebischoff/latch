import { randomUUID } from "node:crypto";

import { NotFoundError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

export type CreateGeneralBucketPurchaseOrderInput = {
  vendorPartyId: string;
  shipToNote?: string;
  deliveryMethod?: string | null;
};

export type CreateGeneralBucketPurchaseOrderResult = {
  id: string;
};

/**
 * RP9–RP10: create a job-less general-bucket PO (`job_id IS NULL`).
 * Lines are added freeform via ad-hoc (no requisitions pool).
 */
export const createGeneralBucketPurchaseOrderTx = async (
  client: PoolClient,
  input: CreateGeneralBucketPurchaseOrderInput,
): Promise<CreateGeneralBucketPurchaseOrderResult> => {
  const vendorPartyId = input.vendorPartyId.trim();
  if (!vendorPartyId) {
    throw new ValidationError("Vendor is required", {
      field: "vendor_party_id",
      code: "vendor_required",
    });
  }

  const vendor = await client.query<{ id: string }>(
    `SELECT p.id
     FROM party p
     INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'vendor'
     WHERE p.id = $1`,
    [vendorPartyId],
  );
  if (!vendor.rows[0]) {
    throw new NotFoundError("Vendor not found");
  }

  const id = randomUUID();
  await client.query(
    `INSERT INTO purchase_order (
       id, job_id, vendor_party_id, status, delivery_method, ship_to_note
     ) VALUES ($1, NULL, $2, 'draft', $3, $4)`,
    [
      id,
      vendorPartyId,
      input.deliveryMethod ?? null,
      input.shipToNote ?? "",
    ],
  );

  return { id };
};

export const createGeneralBucketPurchaseOrder = async (
  pool: Pool,
  actorId: string,
  input: CreateGeneralBucketPurchaseOrderInput,
): Promise<CreateGeneralBucketPurchaseOrderResult> =>
  withPermissionDb(pool, actorId, (client) =>
    createGeneralBucketPurchaseOrderTx(client, input),
  );
