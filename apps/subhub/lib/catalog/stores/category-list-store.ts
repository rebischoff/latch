import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type { CategoryListRow } from "../descriptors/category-list";

const notImplemented = (surfaceId: string, capability: string): never => {
  throw new Error(`${capability} not implemented for ${surfaceId}`);
};

export const createCategoryListStore = (
  _pool: Pool,
): StoreAdapter<CategoryListRow> => ({
  get: async () => undefined,

  list: async () => ({ rows: [], total: 0 }),

  upsert: async () => notImplemented("category_list", "write"),

  delete: async () => notImplemented("category_list", "delete"),

  getRelated: async () => undefined,

  replaceRelated: async () => notImplemented("category_list", "related write"),

  isRowVisibleToPrincipal: async () => true,
});
