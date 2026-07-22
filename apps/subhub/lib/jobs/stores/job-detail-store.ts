import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type {
  JobDetailRelatedPatch,
  JobDetailRow,
  JobDetailStoreRelated,
  JobDetailWriteRow,
} from "../descriptors/job-detail";
import {
  loadJobDetail,
  loadJobDetailRelated,
  applyJobFieldSave,
  replaceJobCollections,
  replaceJobStakeholders,
  updateJob,
} from "../repository";

export const createJobDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<JobDetailRow, JobDetailStoreRelated> => ({
  get: (id) => loadJobDetail(pool, id),

  list: async () => ({ rows: [], total: 0 }),

  upsert: async (row) => {
    const actorId = await getActorId();
    const existing = await loadJobDetail(pool, row.id);
    if (!existing) {
      return;
    }

    const writeRow: JobDetailWriteRow = {
      id: row.id,
      title: row.title,
      site_id: row.site_id,
      job_kind: row.job_kind,
      status: row.status,
    };
    await updateJob(pool, actorId, writeRow, existing);
  },

  delete: async () => {
    throw new Error("job_detail delete is not exposed in wave 5a");
  },

  getRelated: (jobId) => loadJobDetailRelated(pool, jobId),

  replaceRelated: async (jobId, related) => {
    const actorId = await getActorId();
    const job = await loadJobDetail(pool, jobId);
    if (!job) {
      return;
    }

    const patch = related as JobDetailRelatedPatch;

    if (patch.stakeholders !== undefined) {
      await replaceJobStakeholders(pool, actorId, jobId, patch.stakeholders);
    }

    if (patch.conditions !== undefined || patch.line_items !== undefined) {
      await replaceJobCollections(pool, actorId, jobId, job.site_id, {
        conditions: patch.conditions,
        line_items: patch.line_items,
      });
    }

    if (
      patch.field_progress !== undefined ||
      patch.field_zone_orders !== undefined ||
      patch.field_issues !== undefined
    ) {
      await applyJobFieldSave(pool, actorId, jobId, {
        cells: patch.field_progress,
        orderCells: patch.field_zone_orders,
        issues: patch.field_issues,
      });
    }
  },

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadJobDetail(pool, entityId)) !== undefined;
  },
});
