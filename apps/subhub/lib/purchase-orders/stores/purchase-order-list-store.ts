import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type { PurchaseOrderListRow } from "../repository";
import {
  loadPurchaseOrderById,
  loadPurchaseOrderList,
} from "../repository";

const notImplemented = (surface: string, operation: string): never => {
  throw new Error(`${surface} ${operation} is not implemented yet`);
};

export const createPurchaseOrderListStore = (
  pool: Pool,
): StoreAdapter<PurchaseOrderListRow> => ({
  get: async (id) => loadPurchaseOrderById(pool, id),

  list: async (query) =>
    loadPurchaseOrderList(pool, {
      limit: query.limit,
      offset: query.offset,
      job_id: query.job_id as string | undefined,
      status: query.status as string | undefined,
      vendor_party_id: query.vendor_party_id as string | undefined,
      rowScope: query.rowScope,
    }),

  upsert: async () => notImplemented("purchase_order_list", "write"),

  delete: async () => notImplemented("purchase_order_list", "delete"),

  getRelated: async () => undefined,

  replaceRelated: async () =>
    notImplemented("purchase_order_list", "related write"),

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadPurchaseOrderById(pool, entityId)) !== undefined;
  },
});
