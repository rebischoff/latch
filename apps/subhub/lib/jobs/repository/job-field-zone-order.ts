/**
 * Field zone ☐ Order — derive state + zone-attributable BOM qty (task 55 / 56).
 */

import {
  GENERAL_ZONE_KEY,
  zoneKeyFor,
  type JobFieldZoneOrderState,
} from "./job-field-progress";

export type ZoneOrderLineCoverage = {
  site_zone_id: string | null;
  status: string;
};

const FROZEN_STATUSES = new Set(["on_purchase_order", "fulfilled"]);

/**
 * Derive Order checkbox state per leaf zone (+ General) from active
 * `job_material_request` rows.
 */
export const deriveZoneOrders = (input: {
  lines: ZoneOrderLineCoverage[];
  zoneKeys: string[];
}): JobFieldZoneOrderState[] => {
  const byZone = new Map<
    string,
    { hasActive: boolean; locked: boolean }
  >();

  for (const key of input.zoneKeys) {
    byZone.set(key, { hasActive: false, locked: false });
  }

  for (const line of input.lines) {
    const key = zoneKeyFor(line.site_zone_id);
    const entry = byZone.get(key) ?? { hasActive: false, locked: false };
    entry.hasActive = true;
    if (FROZEN_STATUSES.has(line.status)) {
      entry.locked = true;
    }
    byZone.set(key, entry);
  }

  return input.zoneKeys.map((zone_key) => {
    const entry = byZone.get(zone_key) ?? { hasActive: false, locked: false };
    return {
      zone_key,
      site_zone_id: zone_key === GENERAL_ZONE_KEY ? null : zone_key,
      ordered: entry.hasActive,
      locked: entry.locked,
    };
  });
};

/**
 * Zone-attributable BOM demand (L22): proportional share of part qty by
 * allocation qty / line qty. Shared/unplaced → General share only (L19).
 */
export const zoneAttributableBomQty = (input: {
  allocQty: number;
  lineQty: number;
  partQty: number;
}): number => {
  const lineQty = Number(input.lineQty);
  const allocQty = Number(input.allocQty);
  const partQty = Number(input.partQty);
  if (!(lineQty > 0) || !(allocQty > 0) || !(partQty > 0)) {
    return 0;
  }
  return partQty * (allocQty / lineQty);
};

/** Soft-spec / engineered orderability (L18) — empty TBD is not orderable. */
export const isOrderableBomPart = (input: {
  description: string | null | undefined;
  part_id: string | null | undefined;
}): boolean => {
  if (input.part_id) {
    return true;
  }
  return (input.description ?? "").trim().length > 0;
};

/**
 * Cap zone demand at job-wide remaining (R3/R4 + L22).
 */
export const zoneOrderQty = (input: {
  remaining: number;
  zoneDemand: number;
}): number => {
  const remaining = Math.max(0, Number(input.remaining));
  const zoneDemand = Math.max(0, Number(input.zoneDemand));
  return Math.min(zoneDemand, remaining);
};
