import { randomUUID } from "node:crypto";

import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

export type PurchaseOrderLineSourceInput = {
  jobMaterialRequestId: string;
  quantity: number;
};

const toNumber = (value: unknown): number => Number(value ?? 0);

/**
 * Attach originating `job_material_request` rows to a PO line with an explicit qty split
 * (task 56 PO7–PO9). Validates sum(sources.quantity) === line.quantity (app-level).
 * Flips each referenced request's status to `on_purchase_order`.
 *
 * Primitive for task 53 PO-line creation — not wired to UI here.
 */
export const attachSourceTx = async (
  client: PoolClient,
  purchaseOrderLineId: string,
  sources: PurchaseOrderLineSourceInput[],
): Promise<void> => {
  if (sources.length === 0) {
    throw new ValidationError("At least one source is required", {
      field: "sources",
      code: "sources_required",
    });
  }

  for (const source of sources) {
    if (!(source.quantity > 0)) {
      throw new ValidationError("Source quantity must be > 0", {
        field: "sources",
        code: "invalid_quantity",
        job_material_request_id: source.jobMaterialRequestId,
      });
    }
  }

  const lineResult = await client.query<{ quantity: string | number }>(
    `SELECT quantity FROM purchase_order_line WHERE id = $1`,
    [purchaseOrderLineId],
  );
  const line = lineResult.rows[0];
  if (!line) {
    throw new ValidationError("Unknown purchase_order_line", {
      field: "purchase_order_line_id",
      code: "unknown_line",
      id: purchaseOrderLineId,
    });
  }

  const lineQty = toNumber(line.quantity);
  const sourceSum = sources.reduce((sum, row) => sum + row.quantity, 0);
  if (Math.abs(sourceSum - lineQty) > 1e-9) {
    throw new ValidationError(
      "Sum of source quantities must equal purchase order line quantity",
      {
        field: "sources",
        code: "qty_sum_mismatch",
        line_quantity: lineQty,
        sources_sum: sourceSum,
      },
    );
  }

  const requestIds = sources.map((row) => row.jobMaterialRequestId);
  const requestResult = await client.query<{ id: string; status: string }>(
    `SELECT id, status FROM job_material_request WHERE id = ANY($1::text[])`,
    [requestIds],
  );
  if (requestResult.rows.length !== requestIds.length) {
    const found = new Set(requestResult.rows.map((row) => row.id));
    const missing = requestIds.filter((id) => !found.has(id));
    throw new ValidationError("Unknown job_material_request", {
      field: "sources",
      code: "unknown_request",
      missing,
    });
  }

  for (const source of sources) {
    await client.query(
      `INSERT INTO purchase_order_line_source (
         id, purchase_order_line_id, job_material_request_id, quantity
       ) VALUES ($1, $2, $3, $4)`,
      [
        randomUUID(),
        purchaseOrderLineId,
        source.jobMaterialRequestId,
        source.quantity,
      ],
    );
  }

  await client.query(
    `UPDATE job_material_request
     SET status = 'on_purchase_order', updated_at = now()
     WHERE id = ANY($1::text[])
       AND status = 'open'`,
    [requestIds],
  );
};
