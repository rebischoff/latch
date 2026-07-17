import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type {
  RequestedOrderDetailRelatedPatch,
  RequestedOrderDetailRow,
  RequestedOrderDetailStoreRelated,
  RequestedOrderDetailWriteRow,
} from "../descriptors/requested-order-detail";
import {
  deleteRequestedOrder,
  loadRequestedOrderDetail,
  loadRequestedOrderDetailRelated,
  replaceRequestedOrderLineItems,
  updateRequestedOrder,
} from "../repository";

export const createRequestedOrderDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<RequestedOrderDetailRow, RequestedOrderDetailStoreRelated> => ({
  get: (id) => loadRequestedOrderDetail(pool, id),

  list: async () => ({ rows: [], total: 0 }),

  upsert: async (row) => {
    const actorId = await getActorId();
    const existing = await loadRequestedOrderDetail(pool, row.id);
    if (!existing) {
      return;
    }

    const writeRow: RequestedOrderDetailWriteRow = {
      id: row.id,
      job_id: existing.job_id,
      note: row.note,
    };
    await updateRequestedOrder(pool, actorId, writeRow);
  },

  delete: async (id) => {
    const actorId = await getActorId();
    await deleteRequestedOrder(pool, actorId, id);
  },

  getRelated: async (requestedOrderId) =>
    loadRequestedOrderDetailRelated(pool, requestedOrderId),

  replaceRelated: async (requestedOrderId, related) => {
    const actorId = await getActorId();
    const existing = await loadRequestedOrderDetail(pool, requestedOrderId);
    if (!existing) {
      return;
    }

    const patch = related as RequestedOrderDetailRelatedPatch;
    if (patch.line_items !== undefined) {
      await replaceRequestedOrderLineItems(
        pool,
        actorId,
        existing.job_id,
        requestedOrderId,
        patch.line_items,
      );
    }
  },

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadRequestedOrderDetail(pool, entityId)) !== undefined;
  },
});
