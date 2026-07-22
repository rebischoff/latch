import { randomUUID } from "node:crypto";

import { ConflictError, NotFoundError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { resolveLineDetails } from "./batch-create";

export type AdHocPoLineInput = {
  description?: string;
  partId?: string | null;
  quantity: number;
  unit?: string;
  unitPrice?: number;
};

export type AdHocPoLineResult = {
  purchaseOrderLineId: string;
};

/**
 * Freeform ad-hoc line on a **general-bucket** PO (`job_id IS NULL`, RP10).
 * Job-assigned POs reject direct line add (RP8 — pool / batch-create only).
 * No backing `job_material_request` / source link — general bucket is job-less.
 */
export const addAdHocPurchaseOrderLineTx = async (
  client: PoolClient,
  purchaseOrderId: string,
  input: AdHocPoLineInput,
): Promise<AdHocPoLineResult> => {
  if (!(input.quantity > 0)) {
    throw new ValidationError("Quantity must be > 0", {
      field: "quantity",
      code: "invalid_quantity",
    });
  }

  const hasDescription = (input.description ?? "").trim().length > 0;
  const hasPart = Boolean(input.partId);
  if (!hasDescription && !hasPart) {
    throw new ValidationError("Ad-hoc lines require a description and/or a part", {
      field: "description",
      code: "missing_freeform_detail",
    });
  }

  const poResult = await client.query<{
    id: string;
    job_id: string | null;
    vendor_party_id: string;
    status: string;
  }>(
    `SELECT id, job_id, vendor_party_id, status FROM purchase_order WHERE id = $1`,
    [purchaseOrderId],
  );
  const po = poResult.rows[0];
  if (!po) {
    throw new NotFoundError("Purchase order not found");
  }
  if (po.job_id != null) {
    throw new ConflictError(
      "Cannot add lines directly to a job-assigned purchase order — use the requisitions pool",
      {
        field: "job_id",
        code: "job_assigned_po_no_direct_lines",
        purchase_order_id: purchaseOrderId,
        job_id: po.job_id,
      },
    );
  }
  if (po.status !== "draft") {
    throw new ConflictError("Ad-hoc lines can only be added to draft purchase orders", {
      field: "status",
      code: "po_not_draft",
      status: po.status,
    });
  }

  const inputDescription = (input.description ?? "").trim();

  const seeded = await resolveLineDetails(
    client,
    input.partId ?? null,
    po.vendor_party_id,
    inputDescription || "Material",
  );
  const description = seeded.description;
  const unitPrice = input.unitPrice ?? seeded.unitPrice;
  const vendorPartId = seeded.vendorPartId;

  const lineNumberResult = await client.query<{ max: number | null }>(
    `SELECT MAX(line_number)::int AS max
     FROM purchase_order_line WHERE purchase_order_id = $1`,
    [purchaseOrderId],
  );
  const lineNumber = (lineNumberResult.rows[0]?.max ?? 0) + 1;
  const lineId = randomUUID();
  const unit = input.unit ?? "ea";

  await client.query(
    `INSERT INTO purchase_order_line (
       id, purchase_order_id, line_number, description, quantity, unit,
       unit_price, part_id, vendor_part_id, job_line_part_id, item_id, status, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, NULL, 'draft', $10)`,
    [
      lineId,
      purchaseOrderId,
      lineNumber,
      description,
      input.quantity,
      unit,
      unitPrice,
      input.partId ?? null,
      vendorPartId,
      lineNumber,
    ],
  );

  await client.query(
    `UPDATE purchase_order SET updated_at = now() WHERE id = $1`,
    [purchaseOrderId],
  );

  return { purchaseOrderLineId: lineId };
};

export const addAdHocPurchaseOrderLine = async (
  pool: Pool,
  actorId: string,
  purchaseOrderId: string,
  input: AdHocPoLineInput,
): Promise<AdHocPoLineResult> =>
  withPermissionDb(pool, actorId, (client) =>
    addAdHocPurchaseOrderLineTx(client, purchaseOrderId, input),
  );
