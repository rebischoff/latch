import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type {
  PartDetailRelatedPatch,
  PartDetailRow,
  PartDetailStoreRelated,
  PartDetailWriteRow,
} from "../descriptors/part-detail";
import {
  deletePart,
  loadPartDetail,
  loadPartDetailRelated,
  replaceItemLinks,
  replacePartSpecs,
  replaceVendorPricing,
  updatePart,
} from "../repository";

export const createPartDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<PartDetailRow, PartDetailStoreRelated> => ({
  get: (id) => loadPartDetail(pool, id),

  list: async () => ({ rows: [], total: 0 }),

  upsert: async (row) => {
    const actorId = await getActorId();
    const existing = await loadPartDetail(pool, row.id);
    if (!existing) {
      return;
    }

    const writeRow: PartDetailWriteRow = {
      id: row.id,
      manufacturer_party_id: row.manufacturer_party_id,
      mpn: row.mpn,
      description: row.description,
      unit: row.unit,
      purchase_unit: row.purchase_unit,
      units_per_purchase: row.units_per_purchase,
    };
    await updatePart(pool, actorId, writeRow, existing);
  },

  delete: async (id) => {
    const actorId = await getActorId();
    await deletePart(pool, actorId, id);
  },

  getRelated: (partId) => loadPartDetailRelated(pool, partId),

  replaceRelated: async (partId, related) => {
    const actorId = await getActorId();
    const part = await loadPartDetail(pool, partId);
    if (!part) {
      return;
    }

    const patch = related as PartDetailRelatedPatch;
    if (patch.vendor_pricing !== undefined) {
      await replaceVendorPricing(pool, actorId, partId, patch.vendor_pricing);
    }
    if (patch.item_links !== undefined) {
      await replaceItemLinks(pool, actorId, partId, patch.item_links);
    }
    if (patch.part_specs !== undefined) {
      await replacePartSpecs(pool, actorId, partId, patch.part_specs);
    }
  },

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadPartDetail(pool, entityId)) !== undefined;
  },
});
