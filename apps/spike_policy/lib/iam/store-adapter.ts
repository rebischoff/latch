import type { StoreAdapter } from "@latch/dal";

import type { MemoryRoleStore, RoleRecord, RoleRelatedData } from "./memory-role-store.js";

export const createRoleStoreAdapter = (
  store: MemoryRoleStore,
): StoreAdapter<RoleRecord, RoleRelatedData> => ({
  get: (id) => store.get(id),
  upsert: (row) => store.upsert(row),
  delete: (id) => store.deleteRole(id),
  getRelated: (id) => store.getRelated(id),
  replaceRelated: (id, related) => {
    store.replaceBindings(id, related.bindings);
    store.replaceGrants(id, related.grants);
  },
  isRowVisibleToPrincipal: (_id, _principalId, rowScope) =>
    rowScope === "all" || rowScope === "own",
  list: () => ({ rows: [], total: 0 }),
});
