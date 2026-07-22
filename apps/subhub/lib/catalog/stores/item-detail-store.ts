import type { StoreAdapter } from "@latch/dal";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool } from "pg";

import type {
  ItemDetailRelatedPatch,
  ItemDetailRow,
  ItemDetailStoreRelated,
  ItemDetailWriteRow,
} from "../descriptors/item-detail";
import {
  loadItemDetail,
  loadItemDetailRelated,
} from "../repository/item-detail";
import { applyScopeSpecDefinitionsTx } from "../repository/item-spec-definitions-write";
import {
  deleteItem,
  replaceItemLaborPhases,
  updateItem,
} from "../repository/item-write";

export const createItemDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<ItemDetailRow, ItemDetailStoreRelated> => ({
  get: (id) => loadItemDetail(pool, id),

  list: async () => ({ rows: [], total: 0 }),

  upsert: async (row) => {
    const actorId = await getActorId();
    const existing = await loadItemDetail(pool, row.id);
    if (!existing) {
      return;
    }

    const writeRow: ItemDetailWriteRow = {
      id: row.id,
      name: row.name,
      node_type: row.node_type,
      parent_id: row.parent_id,
      sort_order: row.sort_order,
      csi_code: row.csi_code,
      freight_rate_type_id: row.freight_rate_type_id,
      incidental_rate_type_id: row.incidental_rate_type_id,
      markup_type_id: row.markup_type_id,
      fallback_unit_cost: row.fallback_unit_cost,
      material_phase_id: row.material_phase_id,
    };
    await updateItem(pool, actorId, writeRow);
  },

  delete: async (id) => {
    const actorId = await getActorId();
    await deleteItem(pool, actorId, id);
  },

  getRelated: (categoryId) => loadItemDetailRelated(pool, categoryId),

  replaceRelated: async (categoryId, related) => {
    const actorId = await getActorId();
    const category = await loadItemDetail(pool, categoryId);
    if (!category) {
      return;
    }

    const patch = related as ItemDetailRelatedPatch;

    await withPermissionDb(pool, actorId, async (client) => {
      if (patch.spec_definitions !== undefined) {
        await applyScopeSpecDefinitionsTx(client, category, patch.spec_definitions);
      }

      if (patch.item_labor_phase !== undefined && category.node_type !== "scope") {
        await replaceItemLaborPhases(
          client,
          categoryId,
          patch.item_labor_phase.map((row, index) => ({
            ...row,
            sort_order: row.sort_order ?? index + 1,
          })),
        );
      }
    });
  },

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadItemDetail(pool, entityId)) !== undefined;
  },
});
