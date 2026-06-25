import type { Pool } from "pg";

import { escapeLikePattern } from "../../sites/repository/sql-utils";
import type {
  PartDetailRelated,
  PartDetailRow,
  VendorPricingRow,
} from "../descriptors/part-detail";
import type { PartListRow } from "../descriptors/part-list";

export type PartListQuery = {
  limit: number;
  offset: number;
  q?: string;
  rowScope?: "all" | "own" | "scope";
};

const buildPartListWhere = (
  query: PartListQuery,
  params: unknown[],
): string | null => {
  if (query.rowScope === "own" || query.rowScope === "scope") {
    return null;
  }

  const q = query.q?.trim();
  if (!q) {
    return "TRUE";
  }

  params.push(`%${escapeLikePattern(q)}%`);
  const idx = params.length;
  return `(mp.mpn ILIKE $${idx} ESCAPE '\\' OR mp.description ILIKE $${idx} ESCAPE '\\')`;
};

const mapPartDetailRow = (row: PartDetailRow): PartDetailRow => ({
  ...row,
  units_per_purchase: Number(row.units_per_purchase),
});

const mapVendorPricingRow = (row: VendorPricingRow): VendorPricingRow => ({
  ...row,
  unit_price: Number(row.unit_price),
});

export const loadPartList = async (
  pool: Pool,
  query: PartListQuery,
): Promise<{ rows: PartListRow[]; total: number }> => {
  const params: unknown[] = [];
  const whereSql = buildPartListWhere(query, params);
  if (!whereSql) {
    return { rows: [], total: 0 };
  }

  const countResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM manufacturer_part mp
     INNER JOIN party mfr ON mfr.id = mp.manufacturer_party_id
     WHERE ${whereSql}`,
    params,
  );

  const listParams = [...params, query.limit, query.offset];
  const limitIdx = listParams.length - 1;
  const offsetIdx = listParams.length;
  const listResult = await pool.query<PartListRow>(
    `SELECT
       mp.id,
       mp.mpn,
       mp.description,
       mp.manufacturer_party_id,
       mfr.display_name
     FROM manufacturer_part mp
     INNER JOIN party mfr ON mfr.id = mp.manufacturer_party_id
     WHERE ${whereSql}
     ORDER BY mfr.display_name ASC, mp.mpn ASC, mp.id ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    listParams,
  );

  return {
    rows: listResult.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
};

export const loadPartDetail = async (
  pool: Pool,
  id: string,
): Promise<PartDetailRow | undefined> => {
  const result = await pool.query<PartDetailRow>(
    `SELECT
       mp.id,
       mp.manufacturer_party_id,
       mfr.display_name AS manufacturer_display_name,
       mp.mpn,
       mp.description,
       mp.unit,
       mp.purchase_unit,
       mp.units_per_purchase
     FROM manufacturer_part mp
     INNER JOIN party mfr ON mfr.id = mp.manufacturer_party_id
     WHERE mp.id = $1`,
    [id],
  );

  const row = result.rows[0];
  return row ? mapPartDetailRow(row) : undefined;
};

export const loadVendorPricing = async (
  pool: Pool,
  manufacturerPartId: string,
): Promise<VendorPricingRow[]> => {
  const result = await pool.query<VendorPricingRow>(
    `SELECT
       vp.id,
       vp.vendor_party_id,
       v.display_name AS vendor_display_name,
       vp.vendor_pn,
       vp.vendor_description,
       vp.unit_price,
       vp.is_preferred
     FROM vendor_part vp
     INNER JOIN party v ON v.id = vp.vendor_party_id
     WHERE vp.manufacturer_part_id = $1
     ORDER BY vp.is_preferred DESC, v.display_name ASC, vp.vendor_pn ASC, vp.id ASC`,
    [manufacturerPartId],
  );

  return result.rows.map(mapVendorPricingRow);
};

export const loadPartDetailRelated = async (
  pool: Pool,
  manufacturerPartId: string,
): Promise<PartDetailRelated> => ({
  vendor_pricing: await loadVendorPricing(pool, manufacturerPartId),
});
