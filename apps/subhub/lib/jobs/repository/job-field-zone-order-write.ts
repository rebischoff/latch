import { randomUUID } from "node:crypto";

import { ConflictError, ValidationError } from "@latch/contracts";
import type { Pool, PoolClient } from "pg";

import {
  deleteOpenRequestsForZoneTx,
  insertJobMaterialRequestsTx,
} from "@/lib/requested-orders/repository/write";
import {
  loadPurchaseOrderCoverageForJob,
  loadRequisitionedCoverageForJob,
} from "@/lib/requested-orders/repository/remaining";
import { tableExists } from "@/lib/sites/repository/sql-utils";

import {
  GENERAL_ZONE_KEY,
  zoneKeyFor,
  type JobFieldZoneOrderPatch,
  type JobFieldZoneOrderState,
} from "./job-field-progress";
import {
  deriveZoneOrders,
  isOrderableBomPart,
  zoneAttributableBomQty,
  zoneOrderQty,
} from "./job-field-zone-order";

const toNumber = (value: unknown): number => Number(value ?? 0);

type Db = Pool | PoolClient;

type GeoShare = {
  job_line_id: string;
  line_qty: number;
  site_zone_id: string | null;
  zone_qty: number;
};

type BomPartRow = {
  description: string;
  id: string;
  item_id: string | null;
  job_line_id: string;
  part_id: string | null;
  quantity: number;
  unit: string;
};

const loadGeoShares = async (client: Db, jobId: string): Promise<GeoShare[]> => {
  const linesResult = await client.query<{
    id: string;
    quantity: string | number;
  }>(
    `SELECT id, quantity FROM job_line WHERE job_id = $1 AND status = 'active'`,
    [jobId],
  );

  if (linesResult.rows.length === 0) {
    return [];
  }

  const lineIds = linesResult.rows.map((row) => row.id);
  const lineQty = new Map(
    linesResult.rows.map((row) => [row.id, toNumber(row.quantity)] as const),
  );

  const allocResult = await client.query<{
    job_line_id: string;
    quantity: string | number;
    site_zone_id: string;
  }>(
    `SELECT job_line_id, site_zone_id, quantity
     FROM job_line_allocation
     WHERE job_line_id = ANY($1::text[])`,
    [lineIds],
  );

  const shares: GeoShare[] = [];
  const placedByLine = new Map<string, number>();

  for (const alloc of allocResult.rows) {
    const qty = toNumber(alloc.quantity);
    placedByLine.set(
      alloc.job_line_id,
      (placedByLine.get(alloc.job_line_id) ?? 0) + qty,
    );
    shares.push({
      job_line_id: alloc.job_line_id,
      site_zone_id: alloc.site_zone_id,
      zone_qty: qty,
      line_qty: lineQty.get(alloc.job_line_id) ?? 0,
    });
  }

  for (const line of linesResult.rows) {
    const placed = placedByLine.get(line.id) ?? 0;
    const generalQty = toNumber(line.quantity) - placed;
    if (generalQty > 0) {
      shares.push({
        job_line_id: line.id,
        site_zone_id: null,
        zone_qty: generalQty,
        line_qty: toNumber(line.quantity),
      });
    }
  }

  return shares;
};

const loadBomParts = async (client: Db, jobId: string): Promise<BomPartRow[]> => {
  const result = await client.query<{
    id: string;
    job_line_id: string;
    item_id: string | null;
    part_id: string | null;
    description: string;
    quantity: string | number;
    unit: string;
  }>(
    `SELECT jlp.id, jlp.job_line_id, jl.item_id, jlp.part_id, jlp.description, jlp.quantity, jlp.unit
     FROM job_line_part jlp
     INNER JOIN job_line jl ON jl.id = jlp.job_line_id
     WHERE jl.job_id = $1 AND jl.status = 'active'
     ORDER BY jl.sort_order ASC, jlp.sort_order ASC, jlp.id ASC`,
    [jobId],
  );

  return result.rows.map((row) => ({
    ...row,
    quantity: toNumber(row.quantity),
  }));
};

const loadActiveZoneOrderLines = async (
  client: Db,
  jobId: string,
): Promise<Array<{ id: string; site_zone_id: string | null; status: string }>> => {
  if (!(await tableExists(client, "job_material_request"))) {
    return [];
  }

  const result = await client.query<{
    id: string;
    site_zone_id: string | null;
    status: string;
  }>(
    `SELECT id, site_zone_id, status
     FROM job_material_request
     WHERE job_id = $1`,
    [jobId],
  );

  return result.rows;
};

const orderableZoneKeysFromShares = (shares: GeoShare[]): string[] => {
  const keys = new Set<string>();
  for (const share of shares) {
    keys.add(zoneKeyFor(share.site_zone_id));
  }
  return [...keys].sort((a, b) => {
    if (a === GENERAL_ZONE_KEY) {
      return 1;
    }
    if (b === GENERAL_ZONE_KEY) {
      return -1;
    }
    return a.localeCompare(b);
  });
};

export const loadDerivedZoneOrders = async (
  client: Db,
  jobId: string,
): Promise<JobFieldZoneOrderState[]> => {
  const shares = await loadGeoShares(client, jobId);
  const zoneKeys = orderableZoneKeysFromShares(shares);
  const lines = await loadActiveZoneOrderLines(client, jobId);
  return deriveZoneOrders({ lines, zoneKeys });
};

const buildLinesForZone = async (
  client: Db,
  jobId: string,
  siteZoneId: string | null,
  remainingByPart: Map<string, number>,
): Promise<
  Array<{
    description: string;
    item_id: string | null;
    job_line_part_id: string;
    part_id: string | null;
    quantity: number;
    site_zone_id: string | null;
    unit: string;
  }>
> => {
  const shares = (await loadGeoShares(client, jobId)).filter(
    (share) => (share.site_zone_id ?? null) === (siteZoneId ?? null),
  );
  if (shares.length === 0) {
    return [];
  }

  const parts = await loadBomParts(client, jobId);
  const partsByLine = new Map<string, BomPartRow[]>();
  for (const part of parts) {
    const list = partsByLine.get(part.job_line_id) ?? [];
    list.push(part);
    partsByLine.set(part.job_line_id, list);
  }

  const out: Array<{
    description: string;
    item_id: string | null;
    job_line_part_id: string;
    part_id: string | null;
    quantity: number;
    site_zone_id: string | null;
    unit: string;
  }> = [];

  for (const share of shares) {
    for (const part of partsByLine.get(share.job_line_id) ?? []) {
      if (!isOrderableBomPart(part)) {
        continue;
      }
      const zoneDemand = zoneAttributableBomQty({
        allocQty: share.zone_qty,
        lineQty: share.line_qty,
        partQty: part.quantity,
      });
      const remaining = remainingByPart.get(part.id) ?? 0;
      const quantity = zoneOrderQty({ zoneDemand, remaining });
      if (!(quantity > 0)) {
        continue;
      }
      remainingByPart.set(part.id, Math.max(0, remaining - quantity));
      out.push({
        job_line_part_id: part.id,
        item_id: part.item_id,
        part_id: part.part_id,
        description: part.description,
        quantity,
        unit: part.unit || "ea",
        site_zone_id: siteZoneId,
      });
    }
  }

  return out;
};

/**
 * Apply Field ☐ Order delta on Job Save (task 55/56).
 * Newly checked leaves → fresh `job_material_request` rows (zone-tagged).
 * Uncheck → hard-delete open requests for that zone; block if any are frozen.
 */
export const applyFieldZoneOrdersTx = async (
  client: PoolClient,
  args: {
    desired: JobFieldZoneOrderPatch[];
    jobId: string;
    requestedBy: string | null;
  },
): Promise<{ createdRequestCount: number }> => {
  if (args.desired.length === 0) {
    return { createdRequestCount: 0 };
  }

  if (!(await tableExists(client, "job_material_request"))) {
    throw new ValidationError("Material requests are not available", {
      field: "field_zone_orders",
      code: "table_missing",
    });
  }

  const current = await loadDerivedZoneOrders(client, args.jobId);
  const currentByKey = new Map(current.map((row) => [row.zone_key, row]));

  const toOrder: JobFieldZoneOrderPatch[] = [];
  const toUncheck: JobFieldZoneOrderPatch[] = [];

  for (const intent of args.desired) {
    const key = zoneKeyFor(intent.site_zone_id);
    const prior = currentByKey.get(key) ?? {
      zone_key: key,
      site_zone_id: intent.site_zone_id,
      ordered: false,
      locked: false,
    };

    if (intent.ordered && !prior.ordered) {
      toOrder.push(intent);
    } else if (!intent.ordered && prior.ordered) {
      if (prior.locked) {
        throw new ConflictError(
          "Cannot uncheck Order: one or more requests for this zone are on a purchase order or fulfilled",
          {
            field: "field_zone_orders",
            code: "zone_order_locked",
            site_zone_id: intent.site_zone_id,
          },
        );
      }
      toUncheck.push(intent);
    }
  }

  for (const intent of toUncheck) {
    await deleteOpenRequestsForZoneTx(client, args.jobId, intent.site_zone_id);
  }

  if (toOrder.length === 0) {
    return { createdRequestCount: 0 };
  }

  const [requisitioned, purchaseOrder] = await Promise.all([
    loadRequisitionedCoverageForJob(client, args.jobId),
    loadPurchaseOrderCoverageForJob(client, args.jobId),
  ]);

  const parts = await loadBomParts(client, args.jobId);
  const remainingByPart = new Map<string, number>();
  for (const part of parts) {
    const covered =
      (requisitioned.get(part.id) ?? 0) + (purchaseOrder.get(part.id) ?? 0);
    remainingByPart.set(part.id, Math.max(0, part.quantity - covered));
  }

  const newRows: Array<{
    description: string;
    item_id: string | null;
    job_line_part_id: string;
    part_id: string | null;
    quantity: number;
    site_zone_id: string | null;
    unit: string;
  }> = [];

  for (const intent of toOrder) {
    const zoneLines = await buildLinesForZone(
      client,
      args.jobId,
      intent.site_zone_id,
      remainingByPart,
    );
    newRows.push(...zoneLines);
  }

  if (newRows.length === 0) {
    return { createdRequestCount: 0 };
  }

  await insertJobMaterialRequestsTx(
    client,
    newRows.map((row) => ({
      id: randomUUID(),
      job_id: args.jobId,
      site_zone_id: row.site_zone_id,
      job_line_part_id: row.job_line_part_id,
      item_id: row.item_id,
      part_id: row.part_id,
      description: row.description,
      quantity: row.quantity,
      unit: row.unit,
      status: "open",
      requested_by: args.requestedBy,
    })),
  );

  return { createdRequestCount: newRows.length };
};
