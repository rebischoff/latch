import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type { PartListRow } from "../descriptors/part-list";
import { loadPartDetail, loadPartList } from "../repository";

const notImplemented = (surface: string, operation: string): never => {
  throw new Error(`${surface} ${operation} is not implemented yet`);
};

export const createPartListStore = (pool: Pool): StoreAdapter<PartListRow> => ({
  get: async (id) => {
    const row = await loadPartDetail(pool, id);
    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      mpn: row.mpn,
      description: row.description,
      manufacturer_party_id: row.manufacturer_party_id,
      display_name: row.manufacturer_display_name,
    };
  },

  list: async (query) =>
    loadPartList(pool, {
      limit: query.limit,
      offset: query.offset,
      rowScope: query.rowScope,
    }),

  upsert: async () => notImplemented("part_list", "write"),

  delete: async () => notImplemented("part_list", "delete"),

  getRelated: async () => undefined,

  replaceRelated: async () => notImplemented("part_list", "related write"),

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadPartDetail(pool, entityId)) !== undefined;
  },
});
