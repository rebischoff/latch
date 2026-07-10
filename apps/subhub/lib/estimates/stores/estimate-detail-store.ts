import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type {
  EstimateDetailRelatedPatch,
  EstimateDetailRow,
  EstimateDetailStoreRelated,
  EstimateDetailWriteRow,
} from "../descriptors/estimate-detail";
import {
  deleteEstimate,
  loadEstimateDetail,
  loadEstimateDetailRelated,
  replaceEstimateCollections,
  replaceEstimateStakeholders,
  updateEstimate,
} from "../repository";

export const createEstimateDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<EstimateDetailRow, EstimateDetailStoreRelated> => ({
  get: (id) => loadEstimateDetail(pool, id),

  list: async () => ({ rows: [], total: 0 }),

  upsert: async (row) => {
    const actorId = await getActorId();
    const existing = await loadEstimateDetail(pool, row.id);
    if (!existing) {
      return;
    }

    const writeRow: EstimateDetailWriteRow = {
      id: row.id,
      title: row.title,
      site_id: row.site_id,
      estimate_date: row.estimate_date,
      valid_until: row.valid_until,
      source_estimate_id: row.source_estimate_id,
      item_id: row.item_id,
    };
    await updateEstimate(pool, actorId, writeRow, existing);
  },

  delete: async (id) => {
    const actorId = await getActorId();
    const existing = await loadEstimateDetail(pool, id);
    if (!existing) {
      return;
    }
    await deleteEstimate(pool, actorId, id, existing.status);
  },

  getRelated: async (estimateId) => {
    const estimate = await loadEstimateDetail(pool, estimateId);
    if (!estimate) {
      return {
        stakeholders: [],
        conditions: [],
        site_tree: null,
        line_items: [],
      };
    }
    return loadEstimateDetailRelated(pool, estimateId, estimate.site_id);
  },

  replaceRelated: async (estimateId, related) => {
    const actorId = await getActorId();
    const estimate = await loadEstimateDetail(pool, estimateId);
    if (!estimate) {
      return;
    }

    const patch = related as EstimateDetailRelatedPatch;

    if (patch.stakeholders !== undefined) {
      await replaceEstimateStakeholders(pool, actorId, estimateId, patch.stakeholders);
    }

    if (patch.conditions !== undefined || patch.line_items !== undefined) {
      await replaceEstimateCollections(pool, actorId, estimateId, estimate.site_id, {
        conditions: patch.conditions,
        line_items: patch.line_items,
      });
    }
  },

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadEstimateDetail(pool, entityId)) !== undefined;
  },
});
