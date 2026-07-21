import { randomUUID } from "node:crypto";

import { ConflictError, NotFoundError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { resolveLineDetails } from "./batch-create";
import { attachSourceTx } from "./source-links";

export type AdHocPoLineInput = {
  description?: string;
  partId?: string | null;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  /** Zone for the backing job_material_request; null/omit = General (PO9). */
  siteZoneId?: string | null;
  jobLinePartId?: string | null;
};

export type AdHocPoLineResult = {
  purchaseOrderLineId: string;
  jobMaterialRequestId: string;
};

/**
 * Purchaser ad-hoc add (PO9): create backing job_material_request (General if
 * no zone) at `on_purchase_order` + PO line + source link in one call.
 * Only allowed while the PO is `draft`.
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
    job_id: string;
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
  if (po.status !== "draft") {
    throw new ConflictError("Ad-hoc lines can only be added to draft purchase orders", {
      field: "status",
      code: "po_not_draft",
      status: po.status,
    });
  }

  const inputDescription = (input.description ?? "").trim();

  // IT3/Step5: item_id only when the ad-hoc line ties back to a BOM job_line
  // (via jobLinePartId); otherwise stays null (no item_id invented for ad-hoc).
  let itemId: string | null = null;
  if (input.jobLinePartId) {
    const itemResult = await client.query<{ item_id: string | null }>(
      `SELECT jl.item_id
       FROM job_line_part jlp
       JOIN job_line jl ON jl.id = jlp.job_line_id
       WHERE jlp.id = $1`,
      [input.jobLinePartId],
    );
    itemId = itemResult.rows[0]?.item_id ?? null;
  }

  // IT6: same fallback chain as batch-create — vendor_description ||
  // manufacturer_description || request text (input.description). Override
  // happens later via PO detail editing, not here.
  const seeded = await resolveLineDetails(
    client,
    input.partId ?? null,
    po.vendor_party_id,
    inputDescription || "Material",
  );
  const description = seeded.description;
  const unitPrice = input.unitPrice ?? seeded.unitPrice;
  const vendorPartId = seeded.vendorPartId;

  const requestId = randomUUID();
  const unit = input.unit ?? "ea";
  const siteZoneId = input.siteZoneId ?? null;

  await client.query(
    `INSERT INTO job_material_request (
       id, job_id, site_zone_id, job_line_part_id, item_id, part_id,
       description, quantity, unit, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'on_purchase_order')`,
    [
      requestId,
      po.job_id,
      siteZoneId,
      input.jobLinePartId ?? null,
      itemId,
      input.partId ?? null,
      inputDescription,
      input.quantity,
      unit,
    ],
  );

  const lineNumberResult = await client.query<{ max: number | null }>(
    `SELECT MAX(line_number)::int AS max
     FROM purchase_order_line WHERE purchase_order_id = $1`,
    [purchaseOrderId],
  );
  const lineNumber = (lineNumberResult.rows[0]?.max ?? 0) + 1;
  const lineId = randomUUID();

  await client.query(
    `INSERT INTO purchase_order_line (
       id, purchase_order_id, line_number, description, quantity, unit,
       unit_price, part_id, vendor_part_id, job_line_part_id, item_id, status, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', $12)`,
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
      input.jobLinePartId ?? null,
      itemId,
      lineNumber,
    ],
  );

  // Request is already on_purchase_order; attachSourceTx only flips open → on_PO.
  await attachSourceTx(client, lineId, [
    { jobMaterialRequestId: requestId, quantity: input.quantity },
  ]);

  await client.query(
    `UPDATE purchase_order SET updated_at = now() WHERE id = $1`,
    [purchaseOrderId],
  );

  return { purchaseOrderLineId: lineId, jobMaterialRequestId: requestId };
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
