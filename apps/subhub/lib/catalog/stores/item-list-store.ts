import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type { ItemListRow } from "../descriptors/item-list";

const notImplemented = (surfaceId: string, capability: string): never => {
  throw new Error(`${capability} not implemented for ${surfaceId}`);
};

export const createItemListStore = (
  _pool: Pool,
): StoreAdapter<ItemListRow> => ({
  get: async () => undefined,

  list: async () => ({ rows: [], total: 0 }),

  upsert: async () => notImplemented("item_list", "write"),

  delete: async () => notImplemented("item_list", "delete"),

  getRelated: async () => undefined,

  replaceRelated: async () => notImplemented("item_list", "related write"),

  isRowVisibleToPrincipal: async () => true,
});
