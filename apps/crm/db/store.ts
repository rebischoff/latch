import type { ListQuery, StoreAdapter } from "@latch/dal";

import type {
  MemoryAssignmentRecord,
  MemoryCustomerRecord,
  MemoryJobRecord,
  MemoryJobStore,
  MemorySiteRecord,
  MemoryUserRecord,
} from "./memory-store.js";

/** Role assignment helpers for principals / IAM DAL (Phase 03). */
export const listRolesForUser = (
  store: MemoryJobStore,
  userId: string,
): string[] => store.listRolesForUser(userId);

export const setUserRoles = (
  store: MemoryJobStore,
  userId: string,
  roleIds: string[],
): void => {
  store.setUserRoles(userId, roleIds);
};

export type CustomerRelatedData = {
  sites: MemorySiteRecord[];
  jobHistory: Pick<MemoryJobRecord, "id" | "title" | "status">[];
};

export const createJobStoreAdapter = (
  store: MemoryJobStore,
): StoreAdapter<MemoryJobRecord, MemoryAssignmentRecord[]> => ({
  get: (id) => store.getJob(id),
  list: (query: ListQuery) => store.listJobs(query),
  upsert: (row) => store.upsertJob(row),
  delete: (id) => store.deleteJob(id),
  getRelated: (entityId) => store.getAssignmentsForJob(entityId),
  replaceRelated: (entityId, related) =>
    store.replaceAssignmentsForJob(entityId, related),
  isRowVisibleToPrincipal: (entityId, principalId, rowScope) => {
    if (rowScope !== "own") {
      return true;
    }
    return store.isUserAssignedToJob(entityId, principalId);
  },
});

export const createCustomerStoreAdapter = (
  store: MemoryJobStore,
): StoreAdapter<MemoryCustomerRecord, CustomerRelatedData> => ({
  get: (id) => store.getCustomer(id),
  list: () => ({ rows: [], total: 0 }),
  upsert: (row) => store.upsertCustomer(row),
  delete: (id) => {
    store.customers.delete(id);
    for (const site of [...store.sites.values()]) {
      if (site.customerId === id) {
        store.sites.delete(site.id);
      }
    }
  },
  getRelated: (entityId) => ({
    sites: store.getSitesForCustomer(entityId),
    jobHistory: store.listJobsByCustomerId(entityId).map((job) => ({
      id: job.id,
      title: job.title,
      status: job.status,
    })),
  }),
  replaceRelated: (entityId, related) => {
    for (const site of [...store.sites.values()]) {
      if (site.customerId === entityId) {
        store.sites.delete(site.id);
      }
    }
    for (const site of related.sites) {
      store.upsertSite({ ...site, customerId: entityId });
    }
  },
  isRowVisibleToPrincipal: (_entityId, _principalId, rowScope) =>
    rowScope === "all" || rowScope === undefined,
});

export const createIamUserStoreAdapter = (
  store: MemoryJobStore,
): StoreAdapter<MemoryUserRecord, string[]> => ({
  get: (id) => store.getUser(id),
  list: () => ({ rows: [], total: 0 }),
  upsert: (row) => store.upsertUser(row),
  delete: (id) => {
    store.users.delete(id);
    store.rolesByUser.delete(id);
  },
  getRelated: (entityId) => store.listRolesForUser(entityId),
  replaceRelated: (entityId, roleIds) => store.setUserRoles(entityId, roleIds),
  isRowVisibleToPrincipal: (_entityId, _principalId, rowScope) =>
    rowScope === "all" || rowScope === undefined,
});
