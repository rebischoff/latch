import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type { RequestedOrderListRow } from "../descriptors/requested-order-list";
import { loadRequestedOrderDetail, loadRequestedOrderList } from "../repository";

const notImplemented = (surface: string, operation: string): never => {
  throw new Error(`${surface} ${operation} is not implemented yet`);
};

export const createRequestedOrderListStore = (
  pool: Pool,
): StoreAdapter<RequestedOrderListRow> => ({
  get: async (id) => {
    const row = await loadRequestedOrderDetail(pool, id);
    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      job_id: row.job_id,
      job_title: row.job_title,
      requested_at: row.requested_at,
      note: row.note,
      open_line_count: 0,
    };
  },

  list: async (query) =>
    loadRequestedOrderList(pool, {
      limit: query.limit,
      offset: query.offset,
      job_id: query.job_id as string | undefined,
      rowScope: query.rowScope,
    }),

  upsert: async () => notImplemented("requested_order_list", "write"),

  delete: async () => notImplemented("requested_order_list", "delete"),

  getRelated: async () => undefined,

  replaceRelated: async () => notImplemented("requested_order_list", "related write"),

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadRequestedOrderDetail(pool, entityId)) !== undefined;
  },
});
