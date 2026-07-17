import type { Pool } from "pg";

import { tableExists } from "../../sites/repository/sql-utils";
import type {
  RequestedOrderDetailRelated,
  RequestedOrderDetailRow,
  RequestedOrderLineItemRow,
} from "../descriptors/requested-order-detail";

const num = (value: unknown): number => Number(value ?? 0);

export const loadRequestedOrderDetail = async (
  pool: Pool,
  id: string,
): Promise<RequestedOrderDetailRow | undefined> => {
  const result = await pool.query<RequestedOrderDetailRow>(
    `SELECT
       ro.id,
       ro.job_id,
       j.title AS job_title,
       ro.requested_by,
       p.display_name AS requested_by_display_name,
       ro.requested_at,
       ro.note
     FROM requested_order ro
     INNER JOIN job j ON j.id = ro.job_id
     LEFT JOIN party p ON p.id = ro.requested_by
     WHERE ro.id = $1`,
    [id],
  );

  return result.rows[0];
};

/**
 * Line items with PO # / status joined null-safe (task 52 pin) — `purchase_order_line`
 * / `purchase_order` are migrated in 084 alongside `requested_order*`, but the join is
 * still guarded with `tableExists` per repo convention.
 */
export const loadRequestedOrderLineItems = async (
  pool: Pool,
  requestedOrderId: string,
): Promise<RequestedOrderLineItemRow[]> => {
  const hasPoTables =
    (await tableExists(pool, "purchase_order_line")) &&
    (await tableExists(pool, "purchase_order"));

  const poSelect = hasPoTables
    ? `pol.purchase_order_id, po.po_number AS purchase_order_number, po.status AS purchase_order_status`
    : `NULL::text AS purchase_order_id, NULL::text AS purchase_order_number, NULL::text AS purchase_order_status`;

  const poJoin = hasPoTables
    ? `LEFT JOIN LATERAL (
         SELECT id, purchase_order_id
         FROM purchase_order_line
         WHERE requested_order_line_id = rol.id
         ORDER BY id ASC
         LIMIT 1
       ) pol ON TRUE
       LEFT JOIN purchase_order po ON po.id = pol.purchase_order_id`
    : "";

  const result = await pool.query<{
    id: string;
    line_number: number;
    sort_order: number;
    job_line_part_id: string | null;
    part_id: string | null;
    part_mpn: string | null;
    part_description: string | null;
    description: string;
    quantity: string | number;
    unit: string;
    status: string;
    withdrawal_note: string;
    purchase_order_id: string | null;
    purchase_order_number: string | null;
    purchase_order_status: string | null;
  }>(
    `SELECT
       rol.id,
       rol.line_number,
       rol.sort_order,
       rol.job_line_part_id,
       rol.part_id,
       mp.mpn AS part_mpn,
       mp.description AS part_description,
       rol.description,
       rol.quantity,
       rol.unit,
       rol.status,
       rol.withdrawal_note,
       ${poSelect}
     FROM requested_order_line rol
     LEFT JOIN manufacturer_part mp ON mp.id = rol.part_id
     ${poJoin}
     WHERE rol.requested_order_id = $1
     ORDER BY rol.sort_order ASC, rol.line_number ASC`,
    [requestedOrderId],
  );

  return result.rows.map((row) => ({
    ...row,
    quantity: num(row.quantity),
  }));
};

export const loadRequestedOrderDetailRelated = async (
  pool: Pool,
  requestedOrderId: string,
): Promise<RequestedOrderDetailRelated> => {
  const line_items = await loadRequestedOrderLineItems(pool, requestedOrderId);
  return { line_items };
};
