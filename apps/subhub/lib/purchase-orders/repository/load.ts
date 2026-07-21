import type { Pool } from "pg";

const toNumber = (value: unknown): number => Number(value ?? 0);

export type PurchaseOrderListRow = {
  id: string;
  po_number: string | null;
  status: string;
  job_id: string;
  job_title: string;
  vendor_party_id: string;
  vendor_display_name: string;
  order_date: string | null;
  created_at: string;
};

export type PurchaseOrderListQuery = {
  limit: number;
  offset: number;
  job_id?: string;
  status?: string;
  vendor_party_id?: string;
  rowScope?: "all" | "own" | "scope";
};

export const loadPurchaseOrderList = async (
  pool: Pool,
  query: PurchaseOrderListQuery,
): Promise<{ rows: PurchaseOrderListRow[]; total: number }> => {
  if (query.rowScope === "own" || query.rowScope === "scope") {
    return { rows: [], total: 0 };
  }

  const params: unknown[] = [];
  const clauses: string[] = ["TRUE"];

  if (query.job_id) {
    params.push(query.job_id);
    clauses.push(`po.job_id = $${params.length}`);
  }
  if (query.status) {
    params.push(query.status);
    clauses.push(`po.status = $${params.length}`);
  }
  if (query.vendor_party_id) {
    params.push(query.vendor_party_id);
    clauses.push(`po.vendor_party_id = $${params.length}`);
  }

  const whereSql = clauses.join(" AND ");

  const countResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM purchase_order po WHERE ${whereSql}`,
    params,
  );

  const listParams = [...params, query.limit, query.offset];
  const limitIdx = listParams.length - 1;
  const offsetIdx = listParams.length;

  const listResult = await pool.query<{
    id: string;
    po_number: string | null;
    status: string;
    job_id: string;
    job_title: string;
    vendor_party_id: string;
    vendor_display_name: string;
    order_date: string | null;
    created_at: string;
  }>(
    `SELECT
       po.id,
       po.po_number,
       po.status,
       po.job_id,
       j.title AS job_title,
       po.vendor_party_id,
       v.display_name AS vendor_display_name,
       po.order_date::text AS order_date,
       po.created_at::text AS created_at
     FROM purchase_order po
     INNER JOIN job j ON j.id = po.job_id
     INNER JOIN party v ON v.id = po.vendor_party_id
     WHERE ${whereSql}
     ORDER BY po.created_at DESC, po.id ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    listParams,
  );

  return {
    rows: listResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
};

export const loadPurchaseOrderById = async (
  pool: Pool,
  id: string,
): Promise<PurchaseOrderListRow | undefined> => {
  const row = await pool.query<{
    id: string;
    po_number: string | null;
    status: string;
    job_id: string;
    job_title: string;
    vendor_party_id: string;
    vendor_display_name: string;
    order_date: string | null;
    created_at: string;
  }>(
    `SELECT
       po.id,
       po.po_number,
       po.status,
       po.job_id,
       j.title AS job_title,
       po.vendor_party_id,
       v.display_name AS vendor_display_name,
       po.order_date::text AS order_date,
       po.created_at::text AS created_at
     FROM purchase_order po
     INNER JOIN job j ON j.id = po.job_id
     INNER JOIN party v ON v.id = po.vendor_party_id
     WHERE po.id = $1`,
    [id],
  );
  return row.rows[0];
};

export type PurchaseOrderShipmentDto = {
  id: string;
  shipment_number: number;
  quantity: number;
  eta_date: string | null;
  delivered_at: string | null;
  received_at: string | null;
  status: string;
};

export type PurchaseOrderSourceDto = {
  id: string;
  job_material_request_id: string;
  quantity: number;
  site_zone_id: string | null;
  site_zone_name: string | null;
  request_status: string;
};

export type PurchaseOrderLineDto = {
  id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  part_id: string | null;
  part_mpn: string | null;
  vendor_part_id: string | null;
  job_line_part_id: string | null;
  item_id: string | null;
  item_name: string | null;
  status: string;
  ordered_at: string | null;
  shipments: PurchaseOrderShipmentDto[];
  sources: PurchaseOrderSourceDto[];
};

export type PurchaseOrderDetailRow = {
  id: string;
  po_number: string | null;
  status: string;
  job_id: string;
  job_title: string;
  vendor_party_id: string;
  vendor_display_name: string;
  delivery_method: string | null;
  ship_to_note: string;
  order_date: string | null;
  created_at: string;
  updated_at: string;
  line_items: PurchaseOrderLineDto[];
};

export const loadPurchaseOrderDetail = async (
  pool: Pool,
  id: string,
): Promise<PurchaseOrderDetailRow | undefined> => {
  const header = await pool.query<{
    id: string;
    po_number: string | null;
    status: string;
    job_id: string;
    job_title: string;
    vendor_party_id: string;
    vendor_display_name: string;
    delivery_method: string | null;
    ship_to_note: string;
    order_date: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT
       po.id,
       po.po_number,
       po.status,
       po.job_id,
       j.title AS job_title,
       po.vendor_party_id,
       v.display_name AS vendor_display_name,
       po.delivery_method,
       po.ship_to_note,
       po.order_date::text AS order_date,
       po.created_at::text AS created_at,
       po.updated_at::text AS updated_at
     FROM purchase_order po
     INNER JOIN job j ON j.id = po.job_id
     INNER JOIN party v ON v.id = po.vendor_party_id
     WHERE po.id = $1`,
    [id],
  );
  const po = header.rows[0];
  if (!po) {
    return undefined;
  }

  const lines = await pool.query<{
    id: string;
    line_number: number;
    description: string;
    quantity: string | number;
    unit: string;
    unit_price: string | number;
    part_id: string | null;
    part_mpn: string | null;
    vendor_part_id: string | null;
    job_line_part_id: string | null;
    item_id: string | null;
    item_name: string | null;
    status: string;
    ordered_at: string | null;
  }>(
    `SELECT
       pol.id,
       pol.line_number,
       pol.description,
       pol.quantity,
       pol.unit,
       pol.unit_price,
       pol.part_id,
       mp.mpn AS part_mpn,
       pol.vendor_part_id,
       pol.job_line_part_id,
       pol.item_id,
       i.name AS item_name,
       pol.status,
       pol.ordered_at::text AS ordered_at
     FROM purchase_order_line pol
     LEFT JOIN manufacturer_part mp ON mp.id = pol.part_id
     LEFT JOIN item i ON i.id = pol.item_id
     WHERE pol.purchase_order_id = $1
     ORDER BY pol.line_number ASC`,
    [id],
  );

  const lineIds = lines.rows.map((r) => r.id);
  const shipmentsByLine = new Map<string, PurchaseOrderShipmentDto[]>();
  const sourcesByLine = new Map<string, PurchaseOrderSourceDto[]>();

  if (lineIds.length > 0) {
    const shipments = await pool.query<{
      id: string;
      purchase_order_line_id: string;
      shipment_number: number;
      quantity: string | number;
      eta_date: string | null;
      delivered_at: string | null;
      received_at: string | null;
      status: string;
    }>(
      `SELECT
         id, purchase_order_line_id, shipment_number, quantity,
         eta_date::text AS eta_date,
         delivered_at::text AS delivered_at,
         received_at::text AS received_at,
         status
       FROM purchase_order_line_shipment
       WHERE purchase_order_line_id = ANY($1::text[])
       ORDER BY shipment_number ASC`,
      [lineIds],
    );
    for (const row of shipments.rows) {
      const list = shipmentsByLine.get(row.purchase_order_line_id) ?? [];
      list.push({
        id: row.id,
        shipment_number: row.shipment_number,
        quantity: toNumber(row.quantity),
        eta_date: row.eta_date,
        delivered_at: row.delivered_at,
        received_at: row.received_at,
        status: row.status,
      });
      shipmentsByLine.set(row.purchase_order_line_id, list);
    }

    const sources = await pool.query<{
      id: string;
      purchase_order_line_id: string;
      job_material_request_id: string;
      quantity: string | number;
      site_zone_id: string | null;
      site_zone_name: string | null;
      request_status: string;
    }>(
      `SELECT
         pols.id,
         pols.purchase_order_line_id,
         pols.job_material_request_id,
         pols.quantity,
         jmr.site_zone_id,
         sz.name AS site_zone_name,
         jmr.status AS request_status
       FROM purchase_order_line_source pols
       INNER JOIN job_material_request jmr ON jmr.id = pols.job_material_request_id
       LEFT JOIN site_zone sz ON sz.id = jmr.site_zone_id
       WHERE pols.purchase_order_line_id = ANY($1::text[])
       ORDER BY jmr.requested_at ASC, pols.id ASC`,
      [lineIds],
    );
    for (const row of sources.rows) {
      const list = sourcesByLine.get(row.purchase_order_line_id) ?? [];
      list.push({
        id: row.id,
        job_material_request_id: row.job_material_request_id,
        quantity: toNumber(row.quantity),
        site_zone_id: row.site_zone_id,
        site_zone_name: row.site_zone_name,
        request_status: row.request_status,
      });
      sourcesByLine.set(row.purchase_order_line_id, list);
    }
  }

  return {
    ...po,
    line_items: lines.rows.map((line) => ({
      id: line.id,
      line_number: line.line_number,
      description: line.description,
      quantity: toNumber(line.quantity),
      unit: line.unit,
      unit_price: toNumber(line.unit_price),
      part_id: line.part_id,
      part_mpn: line.part_mpn,
      vendor_part_id: line.vendor_part_id,
      job_line_part_id: line.job_line_part_id,
      item_id: line.item_id,
      item_name: line.item_name,
      status: line.status,
      ordered_at: line.ordered_at,
      shipments: shipmentsByLine.get(line.id) ?? [],
      sources: sourcesByLine.get(line.id) ?? [],
    })),
  };
};
