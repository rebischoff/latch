import type { ListQuery, StoreAdapter } from "@latch/dal";

import type { JobRelated, MemoryJobRecord } from "./schema.js";
import type { MemoryJobStore } from "./store.js";

const toListRowScope = (
  rowScope: ListQuery["rowScope"],
): "own" | "all" =>
  rowScope === "own" ? "own" : "all";

export const createJobStoreAdapter = (
  store: MemoryJobStore,
): StoreAdapter<MemoryJobRecord, JobRelated> => ({
  get: async (id) => store.getJob(id),

  list: async (query) => {
    const { rows, total } = store.listJobs({
      principalId: query.principalId,
      rowScope: toListRowScope(query.rowScope),
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
    return { rows, total };
  },

  upsert: async (row) => {
    store.upsertJob(row);
  },

  delete: async (id) => {
    store.deleteJob(id);
  },

  getRelated: async (entityId) => {
    const job = store.getJob(entityId);
    return {
      assignments: store.getAssignmentsForJob(entityId),
      customer: job ? store.getCustomer(job.customerId) : undefined,
    };
  },

  replaceRelated: async (entityId, related) => {
    store.replaceAssignmentsForJob(entityId, related.assignments);
  },

  isRowVisibleToPrincipal: async (
    entityId,
    principalId,
    rowScope,
    _scopeIds,
  ) => {
    if (rowScope === "own") {
      return store.isUserAssignedToJob(entityId, principalId);
    }
    if (rowScope === "scope") {
      return false;
    }
    return true;
  },
});
