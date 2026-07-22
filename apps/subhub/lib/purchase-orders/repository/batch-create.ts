import { randomUUID } from "node:crypto";

import { ConflictError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { attachSourceTx } from "./source-links";

const toNumber = (value: unknown): number => Number(value ?? 0);

export type BatchCreateSelection = {
  jobMaterialRequestId: string;
  vendorPartyId: string;
  /** Staged order qty (decrease-only). Omit = full open ask. */
  quantity?: number;
  /**
   * Staged PN applied at write time. `undefined` = leave request part as-is;
   * `null` = clear to TBD; string = set that manufacturer_part id.
   */
  partId?: string | null;
};

export type BatchCreateInput = {
  selections: BatchCreateSelection[];
  /** When set, add selected requests onto this existing draft PO (vendor must match). */
  purchaseOrderId?: string;
};

export type BatchCreateResult = {
  purchaseOrderIds: string[];
};

type RequestRow = {
  id: string;
  job_id: string;
  site_zone_id: string | null;
  job_line_part_id: string | null;
  item_id: string | null;
  part_id: string | null;
  description: string;
  quantity: string | number;
  unit: string;
  status: string;
};

type PartRollup = {
  partKey: string;
  part_id: string | null;
  job_line_part_id: string | null;
  item_id: string | null;
  description: string;
  unit: string;
  quantity: number;
  sources: Array<{ jobMaterialRequestId: string; quantity: number }>;
};

const partRollupKey = (row: RequestRow): string => {
  if (row.part_id) {
    return `part:${row.part_id}`;
  }
  if (row.job_line_part_id) {
    return `jlp:${row.job_line_part_id}`;
  }
  return `adhoc:${row.id}`;
};

const loadOpenRequests = async (
  client: PoolClient,
  ids: string[],
): Promise<RequestRow[]> => {
  const result = await client.query<RequestRow>(
    `SELECT
       id, job_id, site_zone_id, job_line_part_id, item_id, part_id,
       description, quantity, unit, status
     FROM job_material_request
     WHERE id = ANY($1::text[])`,
    [ids],
  );
  if (result.rows.length !== ids.length) {
    const found = new Set(result.rows.map((row) => row.id));
    const missing = ids.filter((id) => !found.has(id));
    throw new ValidationError("Unknown job_material_request", {
      field: "selections",
      code: "unknown_request",
      missing,
    });
  }
  for (const row of result.rows) {
    if (row.status !== "open") {
      throw new ConflictError(
        `Request ${row.id} is not open (status=${row.status})`,
        { field: "selections", code: "request_not_open", id: row.id },
      );
    }
  }
  return result.rows;
};

/**
 * Apply staged PN + decrease-only qty. Remainder of a decreased ask stays open
 * as a new `job_material_request` row (same zone / description / links).
 */
const applyStagingTx = async (
  client: PoolClient,
  selections: BatchCreateSelection[],
  requests: RequestRow[],
): Promise<RequestRow[]> => {
  const byId = new Map(requests.map((row) => [row.id, row]));
  const staged: RequestRow[] = [];

  for (const sel of selections) {
    const row = byId.get(sel.jobMaterialRequestId);
    if (!row) {
      continue;
    }

    const openQty = toNumber(row.quantity);
    const orderQty =
      sel.quantity === undefined ? openQty : toNumber(sel.quantity);

    if (!(orderQty > 0)) {
      throw new ValidationError("Staged quantity must be > 0", {
        field: "selections",
        code: "invalid_quantity",
        job_material_request_id: row.id,
      });
    }
    if (orderQty > openQty + 1e-9) {
      throw new ValidationError(
        "Staged quantity cannot exceed open ask (decrease only)",
        {
          field: "selections",
          code: "qty_increase_forbidden",
          job_material_request_id: row.id,
          open_quantity: openQty,
          staged_quantity: orderQty,
        },
      );
    }

    if (sel.partId !== undefined) {
      await client.query(
        `UPDATE job_material_request
         SET part_id = $1, updated_at = now()
         WHERE id = $2 AND status = 'open'`,
        [sel.partId, row.id],
      );
      row.part_id = sel.partId;
    }

    // RP6: both part # and vendor must be resolved before Create POs.
    if (!row.part_id) {
      throw new ValidationError(
        "Resolve part # before creating a purchase order",
        {
          field: "selections",
          code: "part_unresolved",
          job_material_request_id: row.id,
        },
      );
    }
    if (!sel.vendorPartyId) {
      throw new ValidationError(
        "Resolve vendor before creating a purchase order",
        {
          field: "selections",
          code: "vendor_unresolved",
          job_material_request_id: row.id,
        },
      );
    }

    if (orderQty < openQty - 1e-9) {
      const remainder = openQty - orderQty;
      const remainderId = randomUUID();
      await client.query(
        `INSERT INTO job_material_request (
           id, job_id, site_zone_id, job_line_part_id, item_id, part_id,
           description, quantity, unit, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open')`,
        [
          remainderId,
          row.job_id,
          row.site_zone_id,
          row.job_line_part_id,
          row.item_id,
          row.part_id,
          row.description,
          remainder,
          row.unit,
        ],
      );
      await client.query(
        `UPDATE job_material_request
         SET quantity = $1, updated_at = now()
         WHERE id = $2 AND status = 'open'`,
        [orderQty, row.id],
      );
      row.quantity = orderQty;
    }

    staged.push(row);
  }

  return staged;
};

const nextLineNumber = async (
  client: PoolClient,
  purchaseOrderId: string,
): Promise<number> => {
  const result = await client.query<{ max: number | null }>(
    `SELECT MAX(line_number)::int AS max
     FROM purchase_order_line
     WHERE purchase_order_id = $1`,
    [purchaseOrderId],
  );
  return (result.rows[0]?.max ?? 0) + 1;
};

/**
 * IT6: line seed description = vendor_description || manufacturer_part.description ||
 * jmr.description (the rollup's own request text) — purchaser may override on the PO.
 */
export const resolveLineDetails = async (
  client: PoolClient,
  partId: string | null,
  vendorPartyId: string,
  fallbackDescription: string,
): Promise<{
  unitPrice: number;
  vendorPartId: string | null;
  description: string;
}> => {
  if (!partId) {
    return { unitPrice: 0, vendorPartId: null, description: fallbackDescription };
  }
  const result = await client.query<{
    id: string | null;
    unit_price: string | number | null;
    vendor_description: string | null;
    manufacturer_description: string;
  }>(
    `SELECT
       vp.id,
       vp.unit_price,
       vp.vendor_description,
       mp.description AS manufacturer_description
     FROM manufacturer_part mp
     LEFT JOIN vendor_part vp
       ON vp.manufacturer_part_id = mp.id AND vp.vendor_party_id = $2
     WHERE mp.id = $1
     ORDER BY vp.is_preferred DESC, vp.unit_price DESC, vp.id ASC
     LIMIT 1`,
    [partId, vendorPartyId],
  );
  const row = result.rows[0];
  if (!row) {
    return { unitPrice: 0, vendorPartId: null, description: fallbackDescription };
  }
  const description =
    (row.vendor_description ?? "").trim() ||
    row.manufacturer_description.trim() ||
    fallbackDescription;
  return {
    unitPrice: toNumber(row.unit_price),
    vendorPartId: row.id,
    description,
  };
};

const insertLineWithSources = async (
  client: PoolClient,
  args: {
    purchaseOrderId: string;
    vendorPartyId: string;
    lineNumber: number;
    rollup: PartRollup;
  },
): Promise<string> => {
  const lineId = randomUUID();
  const { unitPrice, vendorPartId, description } = await resolveLineDetails(
    client,
    args.rollup.part_id,
    args.vendorPartyId,
    args.rollup.description,
  );

  await client.query(
    `INSERT INTO purchase_order_line (
       id, purchase_order_id, line_number, description, quantity, unit,
       unit_price, part_id, vendor_part_id, job_line_part_id, item_id, status, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', $12)`,
    [
      lineId,
      args.purchaseOrderId,
      args.lineNumber,
      description,
      args.rollup.quantity,
      args.rollup.unit,
      unitPrice,
      args.rollup.part_id,
      vendorPartId,
      args.rollup.job_line_part_id,
      args.rollup.item_id,
      args.lineNumber,
    ],
  );

  await attachSourceTx(client, lineId, args.rollup.sources);
  return lineId;
};

const buildRollups = (rows: RequestRow[]): PartRollup[] => {
  const map = new Map<string, PartRollup>();
  for (const row of rows) {
    const key = partRollupKey(row);
    const qty = toNumber(row.quantity);
    const existing = map.get(key);
    if (existing) {
      existing.quantity += qty;
      existing.sources.push({ jobMaterialRequestId: row.id, quantity: qty });
      if (!existing.job_line_part_id && row.job_line_part_id) {
        existing.job_line_part_id = row.job_line_part_id;
      }
      if (!existing.item_id && row.item_id) {
        existing.item_id = row.item_id;
      }
      if (!existing.description && row.description) {
        existing.description = row.description;
      }
    } else {
      map.set(key, {
        partKey: key,
        part_id: row.part_id,
        job_line_part_id: row.job_line_part_id,
        item_id: row.item_id,
        description: row.description || "Material",
        unit: row.unit || "ea",
        quantity: qty,
        sources: [{ jobMaterialRequestId: row.id, quantity: qty }],
      });
    }
  }
  return [...map.values()];
};

const mergeIntoExistingDraft = async (
  client: PoolClient,
  purchaseOrderId: string,
  selections: BatchCreateSelection[],
  requests: RequestRow[],
): Promise<string[]> => {
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
    throw new ValidationError("Unknown purchase_order", {
      field: "purchaseOrderId",
      code: "unknown_po",
      id: purchaseOrderId,
    });
  }
  if (po.status !== "draft") {
    throw new ConflictError("Can only add lines to a draft purchase order", {
      field: "purchaseOrderId",
      code: "po_not_draft",
      status: po.status,
    });
  }

  for (const sel of selections) {
    if (sel.vendorPartyId !== po.vendor_party_id) {
      throw new ValidationError(
        "Vendor must match the existing draft purchase order",
        {
          field: "selections",
          code: "vendor_mismatch",
          purchase_order_id: purchaseOrderId,
        },
      );
    }
  }
  for (const row of requests) {
    if (row.job_id !== po.job_id) {
      throw new ValidationError(
        "Requests must belong to the same job as the draft purchase order",
        {
          field: "selections",
          code: "job_mismatch",
          purchase_order_id: purchaseOrderId,
        },
      );
    }
  }

  const existingLines = await client.query<{
    id: string;
    part_id: string | null;
    job_line_part_id: string | null;
    quantity: string | number;
    description: string;
    unit: string;
  }>(
    `SELECT id, part_id, job_line_part_id, quantity, description, unit
     FROM purchase_order_line
     WHERE purchase_order_id = $1 AND status = 'draft'`,
    [purchaseOrderId],
  );

  const rollups = buildRollups(requests);
  let lineNumber = await nextLineNumber(client, purchaseOrderId);

  for (const rollup of rollups) {
    const match = existingLines.rows.find((line) => {
      if (rollup.part_id && line.part_id) {
        return line.part_id === rollup.part_id;
      }
      if (rollup.job_line_part_id && line.job_line_part_id) {
        return line.job_line_part_id === rollup.job_line_part_id;
      }
      return false;
    });

    if (match) {
      const newQty = toNumber(match.quantity) + rollup.quantity;
      await client.query(
        `UPDATE purchase_order_line SET quantity = $1 WHERE id = $2`,
        [newQty, match.id],
      );
      const priorSources = await client.query<{
        job_material_request_id: string;
        quantity: string | number;
      }>(
        `SELECT job_material_request_id, quantity
         FROM purchase_order_line_source
         WHERE purchase_order_line_id = $1`,
        [match.id],
      );
      await client.query(
        `DELETE FROM purchase_order_line_source WHERE purchase_order_line_id = $1`,
        [match.id],
      );
      const allSources = [
        ...priorSources.rows.map((s) => ({
          jobMaterialRequestId: s.job_material_request_id,
          quantity: toNumber(s.quantity),
        })),
        ...rollup.sources,
      ];
      await attachSourceTx(client, match.id, allSources);
    } else {
      await insertLineWithSources(client, {
        purchaseOrderId,
        vendorPartyId: po.vendor_party_id,
        lineNumber,
        rollup,
      });
      lineNumber += 1;
    }
  }

  await client.query(
    `UPDATE purchase_order SET updated_at = now() WHERE id = $1`,
    [purchaseOrderId],
  );

  return [purchaseOrderId];
};

const createDraftGroups = async (
  client: PoolClient,
  selections: BatchCreateSelection[],
  requests: RequestRow[],
): Promise<string[]> => {
  const byId = new Map(requests.map((row) => [row.id, row]));
  const groups = new Map<
    string,
    { jobId: string; vendorPartyId: string; rows: RequestRow[] }
  >();

  for (const sel of selections) {
    const row = byId.get(sel.jobMaterialRequestId);
    if (!row) {
      continue;
    }
    const key = `${row.job_id}::${sel.vendorPartyId}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(key, {
        jobId: row.job_id,
        vendorPartyId: sel.vendorPartyId,
        rows: [row],
      });
    }
  }

  const purchaseOrderIds: string[] = [];

  for (const group of groups.values()) {
    const poId = randomUUID();
    await client.query(
      `INSERT INTO purchase_order (
         id, job_id, vendor_party_id, status, ship_to_note
       ) VALUES ($1, $2, $3, 'draft', '')`,
      [poId, group.jobId, group.vendorPartyId],
    );

    const rollups = buildRollups(group.rows);
    let lineNumber = 1;
    for (const rollup of rollups) {
      await insertLineWithSources(client, {
        purchaseOrderId: poId,
        vendorPartyId: group.vendorPartyId,
        lineNumber,
        rollup,
      });
      lineNumber += 1;
    }

    purchaseOrderIds.push(poId);
  }

  return purchaseOrderIds;
};

export const batchCreatePurchaseOrdersTx = async (
  client: PoolClient,
  input: BatchCreateInput,
): Promise<BatchCreateResult> => {
  if (!input.selections || input.selections.length === 0) {
    throw new ValidationError("At least one selection is required", {
      field: "selections",
      code: "selections_required",
    });
  }

  const ids = input.selections.map((s) => s.jobMaterialRequestId);
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length !== ids.length) {
    throw new ValidationError("Duplicate request ids in selections", {
      field: "selections",
      code: "duplicate_request",
    });
  }

  for (const sel of input.selections) {
    if (!sel.vendorPartyId) {
      throw new ValidationError("vendorPartyId is required for each selection", {
        field: "selections",
        code: "vendor_required",
        job_material_request_id: sel.jobMaterialRequestId,
      });
    }
  }

  const requests = await loadOpenRequests(client, uniqueIds);
  const staged = await applyStagingTx(client, input.selections, requests);

  const purchaseOrderIds = input.purchaseOrderId
    ? await mergeIntoExistingDraft(
        client,
        input.purchaseOrderId,
        input.selections,
        staged,
      )
    : await createDraftGroups(client, input.selections, staged);

  return { purchaseOrderIds };
};

export const batchCreatePurchaseOrders = async (
  pool: Pool,
  actorId: string,
  input: BatchCreateInput,
): Promise<BatchCreateResult> =>
  withPermissionDb(pool, actorId, (client) =>
    batchCreatePurchaseOrdersTx(client, input),
  );
