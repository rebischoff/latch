import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type { SiteListRow } from "../descriptors/site-list";
import { loadSiteDetail, loadSiteList } from "../repository";

const notImplemented = (surface: string, operation: string): never => {
  throw new Error(`${surface} ${operation} is not implemented yet`);
};

export const createSiteListStore = (pool: Pool): StoreAdapter<SiteListRow> => ({
  get: async (id) => {
    const row = await loadSiteDetail(pool, id);
    return row ? { id: row.id, name: row.name } : undefined;
  },

  list: async (query) =>
    loadSiteList(pool, {
      limit: query.limit,
      offset: query.offset,
      rowScope: query.rowScope,
    }),

  upsert: async () => notImplemented("site_list", "write"),

  delete: async () => notImplemented("site_list", "delete"),

  getRelated: async () => undefined,

  replaceRelated: async () => notImplemented("site_list", "related write"),

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadSiteDetail(pool, entityId)) !== undefined;
  },
});
