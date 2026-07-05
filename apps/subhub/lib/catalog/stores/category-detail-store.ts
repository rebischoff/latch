import type { StoreAdapter } from "@latch/dal";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool } from "pg";

import type {
  CategoryDetailRelatedPatch,
  CategoryDetailRow,
  CategoryDetailStoreRelated,
  CategoryDetailWriteRow,
} from "../descriptors/category-detail";
import {
  loadCategoryDetail,
  loadCategoryDetailRelated,
} from "../repository/category-detail";
import { applyCategorySpecParticipationTx } from "../repository/category-spec-participation-write";
import { loadAllCategories } from "../repository/category-tree";
import {
  applyCategorySpecDefinitionsTx,
} from "../repository/spec-def-write";
import {
  deleteCategory,
  updateCategory,
} from "../repository/category-write";

export const createCategoryDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<CategoryDetailRow, CategoryDetailStoreRelated> => ({
  get: (id) => loadCategoryDetail(pool, id),

  list: async () => ({ rows: [], total: 0 }),

  upsert: async (row) => {
    const actorId = await getActorId();
    const existing = await loadCategoryDetail(pool, row.id);
    if (!existing) {
      return;
    }

    const writeRow: CategoryDetailWriteRow = {
      id: row.id,
      name: row.name,
      parent_id: row.parent_id,
      sort_order: row.sort_order,
      csi_code: row.csi_code,
      default_phase_template_id: row.default_phase_template_id,
    };
    await updateCategory(pool, actorId, writeRow, existing);
  },

  delete: async (id) => {
    const actorId = await getActorId();
    await deleteCategory(pool, actorId, id);
  },

  getRelated: (categoryId) => loadCategoryDetailRelated(pool, categoryId),

  replaceRelated: async (categoryId, related) => {
    const actorId = await getActorId();
    const category = await loadCategoryDetail(pool, categoryId);
    if (!category) {
      return;
    }

    const patch = related as CategoryDetailRelatedPatch;

    await withPermissionDb(pool, actorId, async (client) => {
      if (patch.spec_definitions !== undefined) {
        await applyCategorySpecDefinitionsTx(client, category, patch.spec_definitions);
      }

      if (patch.spec_participation !== undefined) {
        const rootCategoryId = category.is_root
          ? categoryId
          : category.root_category_id;
        if (!rootCategoryId) {
          return;
        }

        const allCategories = await loadAllCategories(pool);
        await applyCategorySpecParticipationTx(
          client,
          categoryId,
          rootCategoryId,
          patch.spec_participation.participates,
          allCategories,
        );
      }
    });
  },

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadCategoryDetail(pool, entityId)) !== undefined;
  },
});
