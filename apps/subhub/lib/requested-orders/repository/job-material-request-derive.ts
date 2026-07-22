/**
 * Live open-demand sync for `/requisitions` (task 63 / RP1).
 *
 * Target open set = locked `job_line_part` × effective material phase (MP3) ×
 * allocation/General × `job_field_order_cell.requested = true`. Sync inserts
 * missing open rows, updates qty/links, and deletes open rows no longer derived.
 * Never mutates `on_purchase_order` / `fulfilled`.
 */

import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import {
  resolveLineMaterialScopePhaseId,
  type ScopePhaseForMaterial,
} from "@/lib/jobs/repository/job-field-order";
import {
  zoneAttributableBomQty,
  zoneOrderQty,
} from "@/lib/jobs/repository/job-field-zone-order";
import { zoneKeyFor } from "@/lib/jobs/repository/job-field-progress";
import { tableExists } from "@/lib/sites/repository/sql-utils";

import { loadPurchaseOrderCoverageForJob } from "./remaining";

const toNumber = (value: unknown): number => Number(value ?? 0);

type Db = Pool | PoolClient;

export type DerivedOpenDemand = {
  job_line_part_id: string;
  job_line_id: string;
  site_zone_id: string | null;
  item_id: string | null;
  part_id: string | null;
  description: string;
  quantity: number;
  unit: string;
};

const demandKey = (
  jobLinePartId: string,
  siteZoneId: string | null,
): string => `${jobLinePartId}:${zoneKeyFor(siteZoneId)}`;

/**
 * Ensure a single BOM row exists when Scope has a PN but `job_line_part` was
 * never seeded (manual pick after win). Soft-lock TBD (no PN) stays without BOM.
 */
export const ensureBomFromJobLineTx = async (
  client: PoolClient,
  jobId: string,
): Promise<void> => {
  if (!(await tableExists(client, "job_line_part"))) {
    return;
  }

  await client.query(
    `INSERT INTO job_line_part (
       job_line_id, part_id, vendor_part_id, description, quantity, unit, unit_cost, sort_order
     )
     SELECT
       jl.id,
       jl.part_id,
       jl.vendor_part_id,
       jl.description,
       jl.quantity,
       jl.unit,
       jl.unit_cost,
       1
     FROM job_line jl
     WHERE jl.job_id = $1
       AND jl.status = 'active'
       AND jl.material_locked = true
       AND jl.part_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM job_line_part jlp WHERE jlp.job_line_id = jl.id
       )`,
    [jobId],
  );
};

type LineCtx = {
  id: string;
  item_id: string | null;
  material_locked: boolean;
  material_phase_id: string | null;
  part_id: string | null;
  quantity: number;
  unit: string;
  description: string;
  ancestryMaterialPhaseIds: Array<string | null>;
  scopePhases: ScopePhaseForMaterial[];
  allocations: Array<{ site_zone_id: string; quantity: number }>;
};

const loadLockedLineContexts = async (
  client: Db,
  jobId: string,
): Promise<Map<string, LineCtx>> => {
  const linesResult = await client.query<{
    id: string;
    item_id: string | null;
    material_locked: boolean;
    material_phase_id: string | null;
    part_id: string | null;
    quantity: string | number;
    unit: string;
    description: string;
  }>(
    `SELECT
       id, item_id, material_locked, material_phase_id, part_id,
       quantity, unit, description
     FROM job_line
     WHERE job_id = $1 AND status = 'active' AND material_locked = true`,
    [jobId],
  );

  if (linesResult.rows.length === 0) {
    return new Map();
  }

  const lineIds = linesResult.rows.map((row) => row.id);
  const itemIds = [
    ...new Set(
      linesResult.rows
        .map((row) => row.item_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const phasesResult = await client.query<{
    id: string;
    job_line_id: string;
    labor_phase_id: string | null;
    sequence: number;
  }>(
    `SELECT id, job_line_id, labor_phase_id, sequence
     FROM scope_phase
     WHERE job_line_id = ANY($1::text[])`,
    [lineIds],
  );
  const phasesByLine = new Map<string, ScopePhaseForMaterial[]>();
  for (const row of phasesResult.rows) {
    const list = phasesByLine.get(row.job_line_id) ?? [];
    list.push({
      id: row.id,
      labor_phase_id: row.labor_phase_id,
      sequence: Number(row.sequence),
    });
    phasesByLine.set(row.job_line_id, list);
  }

  const allocResult = await client.query<{
    job_line_id: string;
    site_zone_id: string;
    quantity: string | number;
  }>(
    `SELECT job_line_id, site_zone_id, quantity
     FROM job_line_allocation
     WHERE job_line_id = ANY($1::text[])`,
    [lineIds],
  );
  const allocsByLine = new Map<
    string,
    Array<{ site_zone_id: string; quantity: number }>
  >();
  for (const row of allocResult.rows) {
    const list = allocsByLine.get(row.job_line_id) ?? [];
    list.push({
      site_zone_id: row.site_zone_id,
      quantity: toNumber(row.quantity),
    });
    allocsByLine.set(row.job_line_id, list);
  }

  const itemMaterialById = new Map<string, string | null>();
  const itemParentById = new Map<string, string | null>();
  if (itemIds.length > 0) {
    const itemResult = await client.query<{
      id: string;
      material_phase_id: string | null;
      parent_id: string | null;
    }>(
      `WITH RECURSIVE chain AS (
         SELECT id, parent_id, material_phase_id
         FROM item
         WHERE id = ANY($1::text[])
         UNION ALL
         SELECT i.id, i.parent_id, i.material_phase_id
         FROM item i
         INNER JOIN chain c ON i.id = c.parent_id
       )
       SELECT DISTINCT id, parent_id, material_phase_id FROM chain`,
      [itemIds],
    );
    for (const row of itemResult.rows) {
      itemMaterialById.set(row.id, row.material_phase_id);
      itemParentById.set(row.id, row.parent_id);
    }
  }

  const ancestryForItem = (itemId: string | null): Array<string | null> => {
    if (!itemId) {
      return [];
    }
    const chain: Array<string | null> = [];
    let current: string | null = itemId;
    const guard = new Set<string>();
    while (current && !guard.has(current)) {
      guard.add(current);
      chain.push(itemMaterialById.get(current) ?? null);
      current = itemParentById.get(current) ?? null;
    }
    return chain;
  };

  const map = new Map<string, LineCtx>();
  for (const row of linesResult.rows) {
    map.set(row.id, {
      id: row.id,
      item_id: row.item_id,
      material_locked: Boolean(row.material_locked),
      material_phase_id: row.material_phase_id,
      part_id: row.part_id,
      quantity: toNumber(row.quantity),
      unit: row.unit || "ea",
      description: row.description,
      ancestryMaterialPhaseIds: ancestryForItem(row.item_id),
      scopePhases: phasesByLine.get(row.id) ?? [],
      allocations: allocsByLine.get(row.id) ?? [],
    });
  }
  return map;
};

const loadRequestedOrderCells = async (
  client: Db,
  scopePhaseIds: string[],
): Promise<Set<string>> => {
  if (
    scopePhaseIds.length === 0 ||
    !(await tableExists(client, "job_field_order_cell"))
  ) {
    return new Set();
  }

  const result = await client.query<{
    scope_phase_id: string;
    site_zone_id: string | null;
  }>(
    `SELECT scope_phase_id, site_zone_id
     FROM job_field_order_cell
     WHERE requested = true
       AND scope_phase_id = ANY($1::text[])`,
    [scopePhaseIds],
  );

  return new Set(
    result.rows.map((row) =>
      `${row.scope_phase_id}:${zoneKeyFor(row.site_zone_id)}`,
    ),
  );
};

/**
 * Pure assembly of the derived open set (no DB writes). Quantity is
 * zone-attributable BOM demand capped by job-wide remaining (demand − PO).
 */
export const computeDerivedOpenDemand = (input: {
  parts: Array<{
    id: string;
    job_line_id: string;
    part_id: string | null;
    description: string;
    quantity: number;
    unit: string;
  }>;
  lines: Map<string, LineCtx>;
  requestedCells: Set<string>;
  poCoverageByPart: Map<string, number>;
}): DerivedOpenDemand[] => {
  const remainingByPart = new Map<string, number>();
  for (const part of input.parts) {
    const demand = part.quantity;
    const covered = input.poCoverageByPart.get(part.id) ?? 0;
    remainingByPart.set(part.id, Math.max(0, demand - covered));
  }

  const out: DerivedOpenDemand[] = [];

  for (const part of input.parts) {
    const line = input.lines.get(part.job_line_id);
    if (!line) {
      continue;
    }

    const scopePhaseId = resolveLineMaterialScopePhaseId({
      lineMaterialPhaseId: line.material_phase_id,
      ancestryMaterialPhaseIds: line.ancestryMaterialPhaseIds,
      scopePhases: line.scopePhases,
    });
    if (!scopePhaseId) {
      continue;
    }

    const lineCtx = line;
    const slices: Array<{ site_zone_id: string | null; zone_qty: number }> = [];
    let placed = 0;
    for (const alloc of lineCtx.allocations) {
      if (!(alloc.quantity > 0)) {
        continue;
      }
      placed += alloc.quantity;
      slices.push({
        site_zone_id: alloc.site_zone_id,
        zone_qty: alloc.quantity,
      });
    }
    const generalQty = lineCtx.quantity - placed;
    if (generalQty > 0) {
      slices.push({ site_zone_id: null, zone_qty: generalQty });
    }

    for (const slice of slices) {
      const cellKey = `${scopePhaseId}:${zoneKeyFor(slice.site_zone_id)}`;
      if (!input.requestedCells.has(cellKey)) {
        continue;
      }

      const zoneDemand = zoneAttributableBomQty({
        allocQty: slice.zone_qty,
        lineQty: lineCtx.quantity,
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
        job_line_id: part.job_line_id,
        site_zone_id: slice.site_zone_id,
        item_id: lineCtx.item_id,
        // Scope line PN wins — soft-lock TBD stays null even when BOM still has a part.
        part_id: lineCtx.part_id,
        description: part.description || lineCtx.description,
        quantity,
        unit: part.unit || lineCtx.unit || "ea",
      });
    }
  }

  return out;
};

/** Compute derived open targets for a job (read-only). */
export const loadDerivedOpenDemandForJob = async (
  client: Db,
  jobId: string,
): Promise<DerivedOpenDemand[]> => {
  if (!(await tableExists(client, "job_material_request"))) {
    return [];
  }
  if (!(await tableExists(client, "job_line_part"))) {
    return [];
  }

  const lines = await loadLockedLineContexts(client, jobId);
  if (lines.size === 0) {
    return [];
  }

  const lineIds = [...lines.keys()];
  const partsResult = await client.query<{
    id: string;
    job_line_id: string;
    part_id: string | null;
    description: string;
    quantity: string | number;
    unit: string;
  }>(
    `SELECT id, job_line_id, part_id, description, quantity, unit
     FROM job_line_part
     WHERE job_line_id = ANY($1::text[])
     ORDER BY sort_order ASC, id ASC`,
    [lineIds],
  );

  if (partsResult.rows.length === 0) {
    return [];
  }

  const scopePhaseIds = [
    ...new Set(
      [...lines.values()].flatMap((line) => {
        const id = resolveLineMaterialScopePhaseId({
          lineMaterialPhaseId: line.material_phase_id,
          ancestryMaterialPhaseIds: line.ancestryMaterialPhaseIds,
          scopePhases: line.scopePhases,
        });
        return id ? [id] : [];
      }),
    ),
  ];

  const [requestedCells, poCoverageByPart] = await Promise.all([
    loadRequestedOrderCells(client, scopePhaseIds),
    loadPurchaseOrderCoverageForJob(client, jobId),
  ]);

  return computeDerivedOpenDemand({
    parts: partsResult.rows.map((row) => ({
      id: row.id,
      job_line_id: row.job_line_id,
      part_id: row.part_id,
      description: row.description,
      quantity: toNumber(row.quantity),
      unit: row.unit,
    })),
    lines,
    requestedCells,
    poCoverageByPart,
  });
};

/**
 * Sync open `job_material_request` rows for one job to the derived set.
 * Returns counts for tests / diagnostics.
 */
export const syncOpenJobMaterialRequestsForJob = async (
  client: PoolClient,
  jobId: string,
  opts?: { requestedBy?: string | null },
): Promise<{ inserted: number; updated: number; deleted: number }> => {
  if (!(await tableExists(client, "job_material_request"))) {
    return { inserted: 0, updated: 0, deleted: 0 };
  }

  await ensureBomFromJobLineTx(client, jobId);
  const derived = await loadDerivedOpenDemandForJob(client, jobId);
  const derivedByKey = new Map(
    derived.map((row) => [demandKey(row.job_line_part_id, row.site_zone_id), row]),
  );

  const existing = await client.query<{
    id: string;
    job_line_part_id: string | null;
    site_zone_id: string | null;
    item_id: string | null;
    part_id: string | null;
    description: string;
    quantity: string | number;
    unit: string;
    status: string;
  }>(
    `SELECT
       id, job_line_part_id, site_zone_id, item_id, part_id,
       description, quantity, unit, status
     FROM job_material_request
     WHERE job_id = $1`,
    [jobId],
  );

  const openByKey = new Map<
    string,
    Array<(typeof existing.rows)[number]>
  >();
  for (const row of existing.rows) {
    if (row.status !== "open" || !row.job_line_part_id) {
      continue;
    }
    const key = demandKey(row.job_line_part_id, row.site_zone_id);
    const list = openByKey.get(key) ?? [];
    list.push(row);
    openByKey.set(key, list);
  }

  let inserted = 0;
  let updated = 0;
  let deleted = 0;

  // Delete open rows whose key left the derived set (never touch frozen).
  for (const [key, rows] of openByKey) {
    if (derivedByKey.has(key)) {
      continue;
    }
    for (const row of rows) {
      await client.query(`DELETE FROM job_material_request WHERE id = $1`, [
        row.id,
      ]);
      deleted += 1;
    }
    openByKey.delete(key);
  }

  for (const [key, target] of derivedByKey) {
    const opens = openByKey.get(key) ?? [];
    const keep = opens[0];
    // Extra open duplicates for the same key — remove.
    for (const extra of opens.slice(1)) {
      await client.query(`DELETE FROM job_material_request WHERE id = $1`, [
        extra.id,
      ]);
      deleted += 1;
    }

    if (!keep) {
      await client.query(
        `INSERT INTO job_material_request (
           id, job_id, site_zone_id, job_line_part_id, item_id, part_id,
           description, quantity, unit, status, requested_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10)`,
        [
          randomUUID(),
          jobId,
          target.site_zone_id,
          target.job_line_part_id,
          target.item_id,
          target.part_id,
          target.description,
          target.quantity,
          target.unit,
          opts?.requestedBy ?? null,
        ],
      );
      inserted += 1;
      continue;
    }

    const qty = toNumber(keep.quantity);
    const needsUpdate =
      qty !== target.quantity ||
      (keep.item_id ?? null) !== target.item_id ||
      (keep.part_id ?? null) !== target.part_id ||
      keep.description !== target.description ||
      (keep.unit || "ea") !== target.unit;

    if (needsUpdate) {
      // Preserve purchaser-staged PN when still open and non-null on the row
      // while Scope line is TBD — only overwrite when derived has a PN or row is empty.
      const nextPartId =
        target.part_id ?? keep.part_id ?? null;

      await client.query(
        `UPDATE job_material_request
         SET item_id = $2,
             part_id = $3,
             description = $4,
             quantity = $5,
             unit = $6,
             updated_at = now()
         WHERE id = $1 AND status = 'open'`,
        [
          keep.id,
          target.item_id,
          nextPartId,
          target.description,
          target.quantity,
          target.unit,
        ],
      );
      updated += 1;
    }
  }

  return { inserted, updated, deleted };
};

/** Sync every job that currently has Order cells or open engineered demand. */
export const syncOpenJobMaterialRequestsAffected = async (
  client: PoolClient,
): Promise<void> => {
  if (!(await tableExists(client, "job_material_request"))) {
    return;
  }

  const jobIds = new Set<string>();

  if (await tableExists(client, "job_field_order_cell")) {
    const ordered = await client.query<{ job_id: string }>(
      `SELECT DISTINCT jl.job_id
       FROM job_field_order_cell c
       INNER JOIN scope_phase sp ON sp.id = c.scope_phase_id
       INNER JOIN job_line jl ON jl.id = sp.job_line_id
       WHERE c.requested = true`,
    );
    for (const row of ordered.rows) {
      jobIds.add(row.job_id);
    }
  }

  const openJobs = await client.query<{ job_id: string }>(
    `SELECT DISTINCT job_id
     FROM job_material_request
     WHERE status = 'open'
       AND job_line_part_id IS NOT NULL`,
  );
  for (const row of openJobs.rows) {
    jobIds.add(row.job_id);
  }

  for (const jobId of jobIds) {
    await syncOpenJobMaterialRequestsForJob(client, jobId);
  }
};
