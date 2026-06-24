import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type { EstimateListRow } from "../descriptors/estimate-list";
import { loadEstimateDetail, loadEstimateList } from "../repository";

const notImplemented = (surface: string, operation: string): never => {
  throw new Error(`${surface} ${operation} is not implemented yet`);
};

export const createEstimateListStore = (
  pool: Pool,
): StoreAdapter<EstimateListRow> => ({
  get: async (id) => {
    const row = await loadEstimateDetail(pool, id);
    if (!row) {
      return undefined;
    }

    return {
      estimate_date: row.estimate_date,
      id: row.id,
      name: row.site_display_name,
      status: row.status,
      title: row.title,
    };
  },

  list: async (query) =>
    loadEstimateList(pool, {
      limit: query.limit,
      offset: query.offset,
      rowScope: query.rowScope,
    }),

  upsert: async () => notImplemented("estimate_list", "write"),

  delete: async () => notImplemented("estimate_list", "delete"),

  getRelated: async () => undefined,

  replaceRelated: async () => notImplemented("estimate_list", "related write"),

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadEstimateDetail(pool, entityId)) !== undefined;
  },
});
