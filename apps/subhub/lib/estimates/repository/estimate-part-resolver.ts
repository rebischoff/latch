import type { Pool, PoolClient } from "pg";

import { unionEffectiveForCategories } from "@/lib/catalog/repository/category-effective-specs";
import { loadItemCategories } from "@/lib/catalog/repository/item-part-category";

import {
  isBucketValueBlank,
  type MergedBucketSpecs,
} from "./estimate-bucket-specs";

export type PartSpecRow = {
  spec_def_id: string;
  spec_option_id: string | null;
  value_boolean: boolean | null;
  value_text: string | null;
};

export type FilteredPartRow = {
  id: string;
  mpn: string;
  description: string;
  max_vendor_price: number;
};

export type MaterialResolveInput = {
  item_id: string;
  part_id: string | null;
  part_locked: boolean;
  material_status: string | null;
};

export type MaterialResolveResult = {
  part_id: string | null;
  part_locked: boolean;
  material_status: "generic" | "suggested" | "verified";
  unit_material: number;
  part_match_alert: string | null;
  filtered_part_count: number;
  vendor_part_id: string | null;
};

type SpecDefMeta = {
  spec_def_id: string;
  value_type: "boolean" | "enum" | "text";
  wildcard_option_id: string | null;
};

const loadItemCategoryIds = async (
  client: Pool | PoolClient,
  itemId: string,
): Promise<string[]> => {
  const linked = await loadItemCategories(client as Pool, itemId);
  if (linked.length > 0) {
    return linked.map((row) => row.category_id);
  }

  const fallback = await client.query<{ category_id: string | null }>(
    `SELECT category_id FROM item WHERE id = $1`,
    [itemId],
  );

  const categoryId = fallback.rows[0]?.category_id ?? null;
  return categoryId ? [categoryId] : [];
};

const loadCandidatePartIds = async (
  client: Pool | PoolClient,
  categoryIds: string[],
): Promise<string[]> => {
  if (categoryIds.length === 0) {
    return [];
  }

  const result = await client.query<{ part_id: string }>(
    `SELECT DISTINCT pc.part_id
     FROM part_category pc
     WHERE pc.category_id = ANY($1::text[])`,
    [categoryIds],
  );

  return result.rows.map((row) => row.part_id);
};

const loadPartSpecs = async (
  client: Pool | PoolClient,
  partIds: string[],
): Promise<Map<string, PartSpecRow[]>> => {
  if (partIds.length === 0) {
    return new Map();
  }

  const result = await client.query<
    PartSpecRow & { manufacturer_part_id: string }
  >(
    `SELECT manufacturer_part_id,
            spec_def_id::text,
            spec_option_id,
            value_text,
            value_boolean
     FROM manufacturer_part_spec
     WHERE manufacturer_part_id = ANY($1::text[])`,
    [partIds],
  );

  const byPart = new Map<string, PartSpecRow[]>();
  for (const row of result.rows) {
    const bucket = byPart.get(row.manufacturer_part_id) ?? [];
    bucket.push({
      spec_def_id: row.spec_def_id,
      spec_option_id: row.spec_option_id,
      value_text: row.value_text,
      value_boolean: row.value_boolean,
    });
    byPart.set(row.manufacturer_part_id, bucket);
  }

  return byPart;
};

const loadSpecDefMeta = async (
  client: Pool | PoolClient,
  specDefIds: string[],
): Promise<Map<string, SpecDefMeta>> => {
  if (specDefIds.length === 0) {
    return new Map();
  }

  const result = await client.query<SpecDefMeta>(
    `SELECT id::text AS spec_def_id, value_type, NULL::uuid AS wildcard_option_id
     FROM spec_def
     WHERE id = ANY($1::uuid[])`,
    [specDefIds],
  );

  return new Map(result.rows.map((row) => [row.spec_def_id, row]));
};

const enumMatches = (
  bucketOptionId: string,
  partRows: PartSpecRow[],
  wildcardOptionId: string | null,
): boolean => {
  if (partRows.length === 0) {
    return false;
  }

  const optionIds = new Set(
    partRows
      .map((row) => row.spec_option_id)
      .filter((id): id is string => id !== null),
  );

  if (optionIds.has(bucketOptionId)) {
    return true;
  }

  if (wildcardOptionId && optionIds.has(wildcardOptionId)) {
    return true;
  }

  return false;
};

const booleanMatches = (bucketValue: boolean, partRows: PartSpecRow[]): boolean =>
  partRows.some((row) => row.value_boolean === bucketValue);

const textMatches = (bucketValue: string, partRows: PartSpecRow[]): boolean =>
  partRows.some((row) => row.value_text === bucketValue);

export const partMatchesBucket = (
  partSpecs: PartSpecRow[],
  bucket: MergedBucketSpecs,
  effectiveDefIds: Set<string>,
  defMeta: Map<string, SpecDefMeta>,
): boolean => {
  for (const defId of effectiveDefIds) {
    const bucketValue = bucket.get(defId);
    if (!bucketValue || isBucketValueBlank(bucketValue)) {
      continue;
    }

    const meta = defMeta.get(defId);
    if (!meta) {
      continue;
    }

    const rowsForDef = partSpecs.filter((row) => row.spec_def_id === defId);

    if (meta.value_type === "enum") {
      if (!bucketValue.spec_option_id) {
        continue;
      }
      if (!enumMatches(bucketValue.spec_option_id, rowsForDef, meta.wildcard_option_id)) {
        return false;
      }
    } else if (meta.value_type === "boolean") {
      if (bucketValue.value_boolean === null) {
        continue;
      }
      if (!booleanMatches(bucketValue.value_boolean, rowsForDef)) {
        return false;
      }
    } else if (meta.value_type === "text") {
      if (bucketValue.value_text === null) {
        continue;
      }
      if (!textMatches(bucketValue.value_text, rowsForDef)) {
        return false;
      }
    }
  }

  return true;
};

export const filterPartsForItem = async (
  client: Pool | PoolClient,
  itemId: string,
  bucket: MergedBucketSpecs,
): Promise<FilteredPartRow[]> => {
  const categoryIds = await loadItemCategoryIds(client, itemId);
  const effectiveDefs = await unionEffectiveForCategories(client as Pool, categoryIds);
  const effectiveDefIds = new Set(effectiveDefs.map((def) => def.spec_def_id));

  const candidateIds = await loadCandidatePartIds(client, categoryIds);
  if (candidateIds.length === 0) {
    return [];
  }

  const specsByPart = await loadPartSpecs(client, candidateIds);
  const defMeta = await loadSpecDefMeta(client, [...effectiveDefIds]);

  const matched: string[] = [];
  for (const partId of candidateIds) {
    const partSpecs = specsByPart.get(partId) ?? [];
    if (partMatchesBucket(partSpecs, bucket, effectiveDefIds, defMeta)) {
      matched.push(partId);
    }
  }

  if (matched.length === 0) {
    return [];
  }

  const priceResult = await client.query<{
    id: string;
    mpn: string;
    description: string;
    max_vendor_price: string | null;
  }>(
    `SELECT mp.id,
            mp.mpn,
            mp.description,
            (
              SELECT MAX(vp.unit_price)
              FROM vendor_part vp
              WHERE vp.manufacturer_part_id = mp.id
            ) AS max_vendor_price
     FROM manufacturer_part mp
     WHERE mp.id = ANY($1::text[])
     ORDER BY mp.mpn ASC, mp.id ASC`,
    [matched],
  );

  return priceResult.rows.map((row) => ({
    id: row.id,
    mpn: row.mpn,
    description: row.description,
    max_vendor_price: Number(row.max_vendor_price ?? 0),
  }));
};

const loadItemFallbackCost = async (
  client: Pool | PoolClient,
  itemId: string,
): Promise<number> => {
  const result = await client.query<{ fallback_unit_cost: string }>(
    `SELECT COALESCE(fallback_unit_cost, 0) AS fallback_unit_cost FROM item WHERE id = $1`,
    [itemId],
  );

  return Number(result.rows[0]?.fallback_unit_cost ?? 0);
};

const loadPartVendorPrice = async (
  client: Pool | PoolClient,
  partId: string,
): Promise<{ unit_price: number; vendor_part_id: string | null }> => {
  const result = await client.query<{
    id: string;
    unit_price: string;
  }>(
    `SELECT id, unit_price
     FROM vendor_part
     WHERE manufacturer_part_id = $1
     ORDER BY is_preferred DESC, unit_price DESC, id ASC
     LIMIT 1`,
    [partId],
  );

  const row = result.rows[0];
  if (!row) {
    return { unit_price: 0, vendor_part_id: null };
  }

  return { unit_price: Number(row.unit_price), vendor_part_id: row.id };
};

const maxVendorAmongParts = (parts: FilteredPartRow[]): number =>
  parts.reduce((max, part) => Math.max(max, part.max_vendor_price), 0);

export const resolveLineMaterial = async (
  client: Pool | PoolClient,
  input: MaterialResolveInput,
  bucket: MergedBucketSpecs,
  isNewLine: boolean,
): Promise<MaterialResolveResult> => {
  const filtered = await filterPartsForItem(client, input.item_id, bucket);
  const fallback = await loadItemFallbackCost(client, input.item_id);
  const filteredCount = filtered.length;

  if (input.part_locked && input.part_id) {
    const stillMatches = filtered.some((part) => part.id === input.part_id);
    const pinned = filtered.find((part) => part.id === input.part_id);
    const vendor =
      pinned ??
      (await client.query<{ id: string; mpn: string; description: string }>(
        `SELECT id, mpn, description FROM manufacturer_part WHERE id = $1`,
        [input.part_id],
      ).then((result) => result.rows[0]));

    let unitMaterial = fallback;
    let vendorPartId: string | null = null;

    if (input.part_id) {
      const price = await loadPartVendorPrice(client, input.part_id);
      unitMaterial = price.unit_price > 0 ? price.unit_price : fallback;
      vendorPartId = price.vendor_part_id;
    }

    return {
      part_id: input.part_id,
      part_locked: true,
      material_status:
        input.material_status === "verified" ? "verified" : "suggested",
      unit_material: unitMaterial,
      part_match_alert: stillMatches
        ? null
        : "Pinned part no longer matches bucket specs",
      filtered_part_count: filteredCount,
      vendor_part_id: vendorPartId,
    };
  }

  if (filteredCount === 0) {
    return {
      part_id: null,
      part_locked: false,
      material_status: "generic",
      unit_material: fallback,
      part_match_alert: "No parts match bucket specs — using fallback cost",
      filtered_part_count: 0,
      vendor_part_id: null,
    };
  }

  if (filteredCount === 1) {
    const part = filtered[0]!;
    const price = await loadPartVendorPrice(client, part.id);
    const unitMaterial =
      price.unit_price > 0 ? price.unit_price : part.max_vendor_price || fallback;

    return {
      part_id: part.id,
      part_locked: false,
      material_status: "suggested",
      unit_material: unitMaterial,
      part_match_alert: null,
      filtered_part_count: 1,
      vendor_part_id: price.vendor_part_id,
    };
  }

  const maxVendor = maxVendorAmongParts(filtered);
  const unitMaterial = maxVendor > 0 ? maxVendor : fallback;

  return {
    part_id: input.part_id,
    part_locked: input.part_locked,
    material_status: input.part_id ? "verified" : "generic",
    unit_material: unitMaterial,
    part_match_alert: input.part_id ? null : "Multiple parts match — pick a PN or use max vendor cost",
    filtered_part_count: filteredCount,
    vendor_part_id: input.part_id
      ? (await loadPartVendorPrice(client, input.part_id)).vendor_part_id
      : null,
  };
};

export const resolveFilteredParts = async (
  client: Pool | PoolClient,
  itemId: string,
  bucket: MergedBucketSpecs,
): Promise<FilteredPartRow[]> => filterPartsForItem(client, itemId, bucket);
