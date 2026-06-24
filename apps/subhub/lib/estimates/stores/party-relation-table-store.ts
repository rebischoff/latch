import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type { JobPartyRelationTableRow } from "../descriptors/party-relation-table";
import {
  deleteJobPartyRelation,
  loadJobPartyRelation,
  loadJobPartyRelationList,
  updateJobPartyRelation,
} from "../repository";

export const createJobPartyRelationTableStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<JobPartyRelationTableRow> => ({
  get: (id) => loadJobPartyRelation(pool, id),

  list: async () => {
    const rows = await loadJobPartyRelationList(pool);
    return { rows, total: rows.length };
  },

  upsert: async (row) => {
    const actorId = await getActorId();
    await updateJobPartyRelation(pool, actorId, row);
  },

  delete: async (id) => {
    const actorId = await getActorId();
    await deleteJobPartyRelation(pool, actorId, id);
  },

  getRelated: async () => ({}),

  replaceRelated: async () => {},

  isRowVisibleToPrincipal: async (entityId) =>
    (await loadJobPartyRelation(pool, entityId)) !== undefined,
});
