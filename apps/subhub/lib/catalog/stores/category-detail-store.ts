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
import { replaceCategorySpecExcludesTx } from "../repository/category-spec-exclude-write";
import {
  assertIncludesExcludesNoOverlap,
  assertRootSpecParticipationExcludes,
  replaceCategorySpecIncludesTx,
} from "../repository/category-spec-participation-write";
import {
  assertRootSpecDefinitionsPatch,
  replaceSpecDefinitionsTx,
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
        assertRootSpecDefinitionsPatch(category.is_root);
        await replaceSpecDefinitionsTx(
          client,
          categoryId,
          patch.spec_definitions,
        );
      }

      if (patch.spec_participation !== undefined) {
        const rootCategoryId = category.is_root
          ? categoryId
          : category.root_category_id;
        if (!rootCategoryId) {
          return;
        }

        const includes = patch.spec_participation.includes ?? [];
        const excludes = patch.spec_participation.excludes ?? [];

        assertRootSpecParticipationExcludes(category.is_root, patch.spec_participation.excludes);
        assertIncludesExcludesNoOverlap(includes, excludes);

        if (patch.spec_participation.includes !== undefined) {
          await replaceCategorySpecIncludesTx(
            client,
            categoryId,
            rootCategoryId,
            includes,
          );
        }

        if (!category.is_root && patch.spec_participation.excludes !== undefined) {
          await replaceCategorySpecExcludesTx(
            client,
            categoryId,
            rootCategoryId,
            excludes,
          );
        }
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
