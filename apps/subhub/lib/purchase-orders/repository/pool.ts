import type { Pool, PoolClient } from "pg";

import {
  syncOpenJobMaterialRequestsAffected,
  syncOpenJobMaterialRequestsForJob,
} from "@/lib/requested-orders/repository/job-material-request-derive";

const toNumber = (value: unknown): number => Number(value ?? 0);

export type PoolVendorCandidate = {
  vendor_party_id: string;
  vendor_display_name: string;
  vendor_part_id: string;
  unit_price: number;
  is_preferred: boolean;
};

export type PoolZoneRequest = {
  id: string;
  quantity: number;
};

export type PoolZoneContribution = {
  site_zone_id: string | null;
  site_zone_name: string | null;
  quantity: number;
  requests: PoolZoneRequest[];
};

/** @deprecated Task 63 — Part # options come from Scope resolver on the client. */
export type PoolPartOption = {
  part_id: string;
  part_mpn: string;
  part_description: string;
};

export type PoolRollupRow = {
  /**
   * Stable rollup key within a job — `jlp:…` (one row per job_line_part / job_line)
   * or `req:…` for legacy ad-hoc rows without a BOM link (RP4).
   */
  key: string;
  job_id: string;
  job_title: string;
  /** Contributing Scope line — for Part # resolver (RP5). */
  job_line_id: string | null;
  /** Condition on that line — for Part # resolver (RP5). */
  job_condition_id: string | null;
  part_id: string | null;
  part_mpn: string | null;
  /** manufacturer_part.description for part_id — null until a PN exists (IT5). */
  part_description: string | null;
  /** Catalog item on the line (single — never merged across lines; RP4). */
  item_id: string | null;
  item_label: string | null;
  /** Soft-spec / TBD text until a PN narrows Description (IT5). */
  description: string;
  quantity: number;
  unit: string;
  vendors: PoolVendorCandidate[];
  zones: PoolZoneContribution[];
  /**
   * Empty — Part # Select uses `fetchJobPartPicker` with job_line/condition (RP5).
   * Kept for API compatibility with older clients.
   */
  part_options: PoolPartOption[];
  /**
   * RP6 hint: part is resolved on the row. Create POs also requires a staged
   * vendor (checked in UI / batch gate).
   */
  po_eligible: boolean;
};

export type PoolJobOption = {
  id: string;
  title: string;
};

type OpenRequestRow = {
  id: string;
  job_id: string;
  job_title: string;
  site_zone_id: string | null;
  site_zone_name: string | null;
  job_line_part_id: string | null;
  job_line_id: string | null;
  job_condition_id: string | null;
  item_id: string | null;
  item_name: string | null;
  part_id: string | null;
  part_mpn: string | null;
  part_description: string | null;
  description: string;
  quantity: string | number;
  unit: string;
};

/** One pool row per job_line_part (RP4). Legacy ad-hoc → per-request key. */
export const poolRollupKey = (row: {
  id: string;
  job_line_part_id: string | null;
  part_id?: string | null;
  description?: string;
}): string => {
  if (row.job_line_part_id) {
    return `jlp:${row.job_line_part_id}`;
  }
  return `req:${row.id}`;
};

const zoneKey = (siteZoneId: string | null): string => siteZoneId ?? "__general__";

/** Distinct jobs that have ≥1 open material request (after live sync). */
export const loadJobsWithOpenDemand = async (
  pool: Pool,
): Promise<PoolJobOption[]> => {
  // Sync-on-read so newly Ordered locked lines appear without a Save snapshot.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await syncOpenJobMaterialRequestsAffected(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const result = await pool.query<PoolJobOption>(
    `SELECT DISTINCT j.id, j.title
     FROM job_material_request jmr
     INNER JOIN job j ON j.id = jmr.job_id
     WHERE jmr.status = 'open'
     ORDER BY j.title ASC, j.id ASC`,
  );
  return result.rows;
};

/**
 * Open demand rolled up by `job × job_line_part` (RP4 — never merge across lines).
 * `jobId` is required — no cross-job all-rows view.
 */
export const loadPoolRollupForJob = async (
  pool: Pool,
  jobId: string,
): Promise<PoolRollupRow[]> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await syncOpenJobMaterialRequestsForJob(client, jobId);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return loadPoolRollupForJobUnlocked(pool, jobId);
};

/** Pool assembly without sync — used by tests and after an outer sync. */
export const loadPoolRollupForJobUnlocked = async (
  pool: Pool | PoolClient,
  jobId: string,
): Promise<PoolRollupRow[]> => {
  const requests = await pool.query<OpenRequestRow>(
    `SELECT
       jmr.id,
       jmr.job_id,
       j.title AS job_title,
       jmr.site_zone_id,
       sz.name AS site_zone_name,
       jmr.job_line_part_id,
       jlp.job_line_id,
       jl.job_condition_id,
       jmr.item_id,
       i.name AS item_name,
       jmr.part_id,
       mp.mpn AS part_mpn,
       mp.description AS part_description,
       jmr.description,
       jmr.quantity,
       jmr.unit
     FROM job_material_request jmr
     INNER JOIN job j ON j.id = jmr.job_id
     LEFT JOIN site_zone sz ON sz.id = jmr.site_zone_id
     LEFT JOIN job_line_part jlp ON jlp.id = jmr.job_line_part_id
     LEFT JOIN job_line jl ON jl.id = jlp.job_line_id
     LEFT JOIN item i ON i.id = jmr.item_id
     LEFT JOIN manufacturer_part mp ON mp.id = jmr.part_id
     WHERE jmr.status = 'open' AND jmr.job_id = $1
     ORDER BY mp.mpn NULLS LAST, jmr.description ASC, jmr.id ASC`,
    [jobId],
  );

  const partIds = [
    ...new Set(
      requests.rows
        .map((r) => r.part_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const vendorsByPart = new Map<string, PoolVendorCandidate[]>();
  if (partIds.length > 0) {
    const vendors = await pool.query<{
      manufacturer_part_id: string;
      vendor_party_id: string;
      vendor_display_name: string;
      vendor_part_id: string;
      unit_price: string | number;
      is_preferred: boolean;
    }>(
      `SELECT
         vp.manufacturer_part_id,
         vp.vendor_party_id,
         v.display_name AS vendor_display_name,
         vp.id AS vendor_part_id,
         vp.unit_price,
         vp.is_preferred
       FROM vendor_part vp
       INNER JOIN party v ON v.id = vp.vendor_party_id
       WHERE vp.manufacturer_part_id = ANY($1::text[])
       ORDER BY vp.is_preferred DESC, v.display_name ASC, vp.id ASC`,
      [partIds],
    );
    for (const row of vendors.rows) {
      const list = vendorsByPart.get(row.manufacturer_part_id) ?? [];
      list.push({
        vendor_party_id: row.vendor_party_id,
        vendor_display_name: row.vendor_display_name,
        vendor_part_id: row.vendor_part_id,
        unit_price: toNumber(row.unit_price),
        is_preferred: row.is_preferred,
      });
      vendorsByPart.set(row.manufacturer_part_id, list);
    }
  }

  const rollups = new Map<string, PoolRollupRow>();

  for (const row of requests.rows) {
    const key = poolRollupKey(row);
    const qty = toNumber(row.quantity);
    const existing = rollups.get(key);
    const zKey = zoneKey(row.site_zone_id);
    const vendors = row.part_id ? (vendorsByPart.get(row.part_id) ?? []) : [];

    if (!existing) {
      rollups.set(key, {
        key,
        job_id: row.job_id,
        job_title: row.job_title,
        job_line_id: row.job_line_id,
        job_condition_id: row.job_condition_id,
        part_id: row.part_id,
        part_mpn: row.part_mpn,
        part_description: row.part_description,
        item_id: row.item_id,
        item_label: row.item_name,
        description: row.description,
        quantity: qty,
        unit: row.unit || "ea",
        vendors,
        zones: [
          {
            site_zone_id: row.site_zone_id,
            site_zone_name: row.site_zone_name,
            quantity: qty,
            requests: [{ id: row.id, quantity: qty }],
          },
        ],
        part_options: [],
        po_eligible: Boolean(row.part_id),
      });
      continue;
    }

    existing.quantity += qty;
    if (!existing.part_mpn && row.part_mpn) {
      existing.part_mpn = row.part_mpn;
      existing.part_description = row.part_description;
      existing.part_id = row.part_id;
      existing.vendors = vendors;
    }
    if (!existing.description && row.description) {
      existing.description = row.description;
    }
    if (!existing.item_id && row.item_id) {
      existing.item_id = row.item_id;
      existing.item_label = row.item_name;
    }
    if (!existing.job_line_id && row.job_line_id) {
      existing.job_line_id = row.job_line_id;
      existing.job_condition_id = row.job_condition_id;
    }

    const zone = existing.zones.find((z) => zoneKey(z.site_zone_id) === zKey);
    if (zone) {
      zone.quantity += qty;
      zone.requests.push({ id: row.id, quantity: qty });
    } else {
      existing.zones.push({
        site_zone_id: row.site_zone_id,
        site_zone_name: row.site_zone_name,
        quantity: qty,
        requests: [{ id: row.id, quantity: qty }],
      });
    }

    existing.po_eligible = Boolean(existing.part_id);
  }

  return [...rollups.values()];
};

/** All vendor parties (for soft-spec / no-part vendor pick). */
export const loadVendorParties = async (
  pool: Pool,
): Promise<Array<{ id: string; display_name: string }>> => {
  const result = await pool.query<{ id: string; display_name: string }>(
    `SELECT p.id, p.display_name
     FROM party p
     INNER JOIN party_role pr ON pr.party_id = p.id AND pr.role = 'vendor'
     ORDER BY p.display_name ASC`,
  );
  return result.rows;
};

/** RP6 helper — both part and vendor must be resolved. */
export const isPoolRowPoEligible = (args: {
  partId: string | null | undefined;
  vendorPartyId: string | null | undefined;
}): boolean => Boolean(args.partId && args.vendorPartyId);
