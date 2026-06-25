import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type { JobListRow } from "../descriptors/job-list";
import { loadJobDetail, loadJobList } from "../repository";

const notImplemented = (surface: string, operation: string): never => {
  throw new Error(`${surface} ${operation} is not implemented yet`);
};

export const createJobListStore = (pool: Pool): StoreAdapter<JobListRow> => ({
  get: async (id) => {
    const row = await loadJobDetail(pool, id);
    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      site_display_name: row.site_display_name,
      title: row.title,
    };
  },

  list: async (query) =>
    loadJobList(pool, {
      limit: query.limit,
      offset: query.offset,
      rowScope: query.rowScope,
    }),

  upsert: async () => notImplemented("job_list", "write"),

  delete: async () => notImplemented("job_list", "delete"),

  getRelated: async () => undefined,

  replaceRelated: async () => notImplemented("job_list", "related write"),

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadJobDetail(pool, entityId)) !== undefined;
  },
});
