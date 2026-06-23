import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type { SiteContactRelationTableRow } from "../descriptors/contact-relation-table";
import {
  deleteSiteContactRelation,
  loadSiteContactRelation,
  loadSiteContactRelationList,
  updateSiteContactRelation,
} from "../repository";

export const createSiteContactRelationTableStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<SiteContactRelationTableRow> => ({
  get: (id) => loadSiteContactRelation(pool, id),

  list: async () => {
    const rows = await loadSiteContactRelationList(pool);
    return { rows, total: rows.length };
  },

  upsert: async (row) => {
    const actorId = await getActorId();
    await updateSiteContactRelation(pool, actorId, row);
  },

  delete: async (id) => {
    const actorId = await getActorId();
    await deleteSiteContactRelation(pool, actorId, id);
  },

  getRelated: async () => ({}),

  replaceRelated: async () => {},

  isRowVisibleToPrincipal: async (entityId) =>
    (await loadSiteContactRelation(pool, entityId)) !== undefined,
});
