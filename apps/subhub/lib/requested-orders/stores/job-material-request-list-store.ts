import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type { JobMaterialRequestListRow } from "../descriptors/job-material-request-list";
import {
  loadJobMaterialRequestById,
  loadJobMaterialRequestList,
} from "../repository";

const notImplemented = (surface: string, operation: string): never => {
  throw new Error(`${surface} ${operation} is not implemented yet`);
};

export const createJobMaterialRequestListStore = (
  pool: Pool,
): StoreAdapter<JobMaterialRequestListRow> => ({
  get: async (id) => loadJobMaterialRequestById(pool, id),

  list: async (query) =>
    loadJobMaterialRequestList(pool, {
      limit: query.limit,
      offset: query.offset,
      job_id: query.job_id as string | undefined,
      status: query.status as string | undefined,
      site_zone_id: query.site_zone_id as string | undefined,
      rowScope: query.rowScope,
    }),

  upsert: async () => notImplemented("job_material_request_list", "write"),

  delete: async () => notImplemented("job_material_request_list", "delete"),

  getRelated: async () => undefined,

  replaceRelated: async () =>
    notImplemented("job_material_request_list", "related write"),

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadJobMaterialRequestById(pool, entityId)) !== undefined;
  },
});
