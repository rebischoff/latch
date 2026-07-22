import { ConflictError, NotFoundError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { resolveLineDetails } from "./batch-create";
import { revertPendingSourcesForQtyTx } from "./revert-sources";

const toNumber = (value: unknown): number => Number(value ?? 0);

export type UpdatePurchaseOrderLineInput = {
  description?: string;
  quantity?: number;
  /** Rejected on job-assigned POs (RP7 part frozen). Allowed on general bucket. */
  partId?: string | null;
};

type LineRow = {
  id: string;
  status: string;
  quantity: string | number;
  part_id: string | null;
  description: string;
  unit_price: string | number;
  vendor_part_id: string | null;
  po_status: string;
  job_id: string | null;
  vendor_party_id: string;
};

/**
 * Patch a PO line while draft (RP7–RP10).
 *
 * Job-assigned (`job_id IS NOT NULL`):
 * - `part_id` frozen (reject change)
 * - `quantity` editable (decrease reverts pending sources; increase rejected —
 *   extra demand must come from the pool / batch-create path)
 * - `description` editable (IT6)
 *
 * General bucket (`job_id IS NULL`): freeform edit of description, qty, part.
 */
export const updatePurchaseOrderLineTx = async (
  client: PoolClient,
  purchaseOrderId: string,
  lineId: string,
  input: UpdatePurchaseOrderLineInput,
): Promise<void> => {
  const hasDescription = input.description !== undefined;
  const hasQuantity = input.quantity !== undefined;
  const hasPartId = input.partId !== undefined;
  if (!hasDescription && !hasQuantity && !hasPartId) {
    throw new ValidationError("No line fields to update", {
      code: "empty_patch",
    });
  }

  const result = await client.query<LineRow>(
    `SELECT
       pol.id,
       pol.status,
       pol.quantity,
       pol.part_id,
       pol.description,
       pol.unit_price,
       pol.vendor_part_id,
       po.status AS po_status,
       po.job_id,
       po.vendor_party_id
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
      "Purchase order line can only be edited while draft",
      { field: "status", code: "line_not_draft", status: line.status },
    );
  }

  const isJobAssigned = line.job_id != null;

  let nextDescription = line.description;
  let nextQty = toNumber(line.quantity);
  let nextPartId = line.part_id;
  let nextVendorPartId = line.vendor_part_id;
  let nextUnitPrice = toNumber(line.unit_price);

  if (hasPartId) {
    const requestedPartId = input.partId ?? null;
    if (isJobAssigned && requestedPartId !== (line.part_id ?? null)) {
      throw new ConflictError(
        "Part is frozen on job-assigned purchase order lines",
        {
          field: "part_id",
          code: "part_frozen",
          purchase_order_id: purchaseOrderId,
          purchase_order_line_id: lineId,
        },
      );
    }
    if (!isJobAssigned) {
      nextPartId = requestedPartId;
      const seeded = await resolveLineDetails(
        client,
        nextPartId,
        line.vendor_party_id,
        (hasDescription
          ? (input.description ?? "").trim()
          : line.description) || "Material",
      );
      nextVendorPartId = seeded.vendorPartId;
      nextUnitPrice = seeded.unitPrice;
      if (!hasDescription && nextPartId) {
        nextDescription = seeded.description;
      }
    }
  }

  if (hasDescription) {
    const trimmed = (input.description ?? "").trim();
    if (!trimmed) {
      throw new ValidationError("Description is required", {
        field: "description",
        code: "description_required",
      });
    }
    nextDescription = trimmed;
  }

  if (hasQuantity) {
    const qty = input.quantity!;
    if (!(qty > 0)) {
      throw new ValidationError("Quantity must be > 0", {
        field: "quantity",
        code: "invalid_quantity",
      });
    }
    const currentQty = toNumber(line.quantity);
    if (isJobAssigned && qty > currentQty + 1e-9) {
      throw new ConflictError(
        "Cannot increase quantity on a job-assigned PO line — pull additional demand from the requisitions pool",
        {
          field: "quantity",
          code: "qty_increase_via_pool",
          current_quantity: currentQty,
          requested_quantity: qty,
        },
      );
    }
    if (isJobAssigned && qty < currentQty - 1e-9) {
      await revertPendingSourcesForQtyTx(client, lineId, currentQty - qty);
    }
    nextQty = qty;
  }

  await client.query(
    `UPDATE purchase_order_line
     SET description = $1,
         quantity = $2,
         part_id = $3,
         vendor_part_id = $4,
         unit_price = $5
     WHERE id = $6`,
    [
      nextDescription,
      nextQty,
      nextPartId,
      nextVendorPartId,
      nextUnitPrice,
      lineId,
    ],
  );
  await client.query(
    `UPDATE purchase_order SET updated_at = now() WHERE id = $1`,
    [purchaseOrderId],
  );
};

export const updatePurchaseOrderLine = async (
  pool: Pool,
  actorId: string,
  purchaseOrderId: string,
  lineId: string,
  input: UpdatePurchaseOrderLineInput,
): Promise<void> =>
  withPermissionDb(pool, actorId, (client) =>
    updatePurchaseOrderLineTx(client, purchaseOrderId, lineId, input),
  );

/** @deprecated Prefer {@link updatePurchaseOrderLineTx} — IT6 description override. */
export const updatePurchaseOrderLineDescriptionTx = async (
  client: PoolClient,
  purchaseOrderId: string,
  lineId: string,
  description: string,
): Promise<void> =>
  updatePurchaseOrderLineTx(client, purchaseOrderId, lineId, { description });

/** @deprecated Prefer {@link updatePurchaseOrderLine}. */
export const updatePurchaseOrderLineDescription = async (
  pool: Pool,
  actorId: string,
  purchaseOrderId: string,
  lineId: string,
  description: string,
): Promise<void> =>
  updatePurchaseOrderLine(pool, actorId, purchaseOrderId, lineId, {
    description,
  });
