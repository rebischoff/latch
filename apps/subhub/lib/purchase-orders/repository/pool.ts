import type { Pool } from "pg";

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

export type PoolPartOption = {
  part_id: string;
  part_mpn: string;
  part_description: string;
};

export type PoolRollupRow = {
  /** Stable rollup key within a job (`part:…` or `soft:…`). */
  key: string;
  job_id: string;
  job_title: string;
  part_id: string | null;
  part_mpn: string | null;
  /** manufacturer_part.description for part_id — null until a PN exists (IT5). */
  part_description: string | null;
  /** Distinct item_ids contributing to this rollup (task 59 IT1/IT4) — display + PN-narrowing only. */
  item_ids: string[];
  /** null = no item (ad-hoc); one name = single item; 'Multiple' when item_ids.length > 1 (IT4). */
  item_label: string | null;
  /** Soft-spec / TBD text until a PN narrows Description (IT5). */
  description: string;
  quantity: number;
  unit: string;
  vendors: PoolVendorCandidate[];
  zones: PoolZoneContribution[];
  /** Parts linked to item_ids via part_item — union when Multiple (IT4). Empty when no item context. */
  part_options: PoolPartOption[];
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
  item_id: string | null;
  item_name: string | null;
  part_id: string | null;
  part_mpn: string | null;
  part_description: string | null;
  description: string;
  quantity: string | number;
  unit: string;
};

/** Soft-spec / unnarrowed: group by description so unrelated TBDs do not merge. */
export const poolRollupKey = (row: {
  part_id: string | null;
  description: string;
}): string => {
  if (row.part_id) {
    return `part:${row.part_id}`;
  }
  return `soft:${row.description.trim().toLowerCase()}`;
};

const zoneKey = (siteZoneId: string | null): string => siteZoneId ?? "__general__";

/** Distinct jobs that have ≥1 open material request. */
export const loadJobsWithOpenDemand = async (
  pool: Pool,
): Promise<PoolJobOption[]> => {
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
 * Open demand rolled up by `job × part` (soft-spec keyed by description).
 * `jobId` is required — no cross-job all-rows view.
 */
export const loadPoolRollupForJob = async (
  pool: Pool,
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
  const itemNamesByKey = new Map<string, Map<string, string | null>>();

  for (const row of requests.rows) {
    const key = poolRollupKey(row);
    const qty = toNumber(row.quantity);
    const existing = rollups.get(key);
    const zKey = zoneKey(row.site_zone_id);

    if (row.item_id) {
      const names = itemNamesByKey.get(key) ?? new Map<string, string | null>();
      names.set(row.item_id, row.item_name);
      itemNamesByKey.set(key, names);
    }

    if (!existing) {
      rollups.set(key, {
        key,
        job_id: row.job_id,
        job_title: row.job_title,
        part_id: row.part_id,
        part_mpn: row.part_mpn,
        part_description: row.part_description,
        item_ids: [],
        item_label: null,
        description: row.description,
        quantity: qty,
        unit: row.unit || "ea",
        vendors: row.part_id ? (vendorsByPart.get(row.part_id) ?? []) : [],
        zones: [
          {
            site_zone_id: row.site_zone_id,
            site_zone_name: row.site_zone_name,
            quantity: qty,
            requests: [{ id: row.id, quantity: qty }],
          },
        ],
        part_options: [],
      });
      continue;
    }

    existing.quantity += qty;
    if (!existing.part_mpn && row.part_mpn) {
      existing.part_mpn = row.part_mpn;
      existing.part_description = row.part_description;
    }
    if (!existing.description && row.description) {
      existing.description = row.description;
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
  }

  const rows = [...rollups.values()];

  // IT4: finalize Item label (null | name | 'Multiple') from the distinct item_ids collected per rollup.
  const allItemIds = new Set<string>();
  for (const row of rows) {
    const names = itemNamesByKey.get(row.key);
    if (!names || names.size === 0) {
      continue;
    }
    row.item_ids = [...names.keys()];
    for (const id of row.item_ids) {
      allItemIds.add(id);
    }
    row.item_label =
      row.item_ids.length === 1 ? (names.get(row.item_ids[0]!) ?? null) : "Multiple";
  }

  // IT4: Part # Select narrowing — union of parts linked (via part_item) to a rollup's item_ids.
  if (allItemIds.size > 0) {
    const linkedParts = await pool.query<{
      item_id: string;
      part_id: string;
      mpn: string;
      description: string;
    }>(
      `SELECT pi.item_id, pi.part_id, mp.mpn, mp.description
       FROM part_item pi
       INNER JOIN manufacturer_part mp ON mp.id = pi.part_id
       WHERE pi.item_id = ANY($1::text[])
       ORDER BY mp.mpn ASC, mp.id ASC`,
      [[...allItemIds]],
    );
    const partsByItem = new Map<string, PoolPartOption[]>();
    for (const row of linkedParts.rows) {
      const list = partsByItem.get(row.item_id) ?? [];
      list.push({
        part_id: row.part_id,
        part_mpn: row.mpn,
        part_description: row.description,
      });
      partsByItem.set(row.item_id, list);
    }

    for (const row of rows) {
      if (row.item_ids.length === 0) {
        continue;
      }
      const seen = new Set<string>();
      const options: PoolPartOption[] = [];
      for (const itemId of row.item_ids) {
        for (const option of partsByItem.get(itemId) ?? []) {
          if (seen.has(option.part_id)) {
            continue;
          }
          seen.add(option.part_id);
          options.push(option);
        }
      }
      row.part_options = options;
    }
  }

  return rows;
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
