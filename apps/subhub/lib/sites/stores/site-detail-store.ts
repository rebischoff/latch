import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type {
  SiteDetailRelatedPatch,
  SiteDetailRow,
  SiteDetailStoreRelated,
} from "../descriptors/site-detail";
import {
  deleteSite,
  loadSiteDetail,
  loadSiteDetailRelated,
  loadSiteScopes,
  replaceSiteContacts,
  replaceSiteScopes,
  toScopePatchRow,
  updateSite,
} from "../repository";

export const createSiteDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<SiteDetailRow, SiteDetailStoreRelated> => ({
  get: (id) => loadSiteDetail(pool, id),

  list: async () => ({ rows: [], total: 0 }),

  upsert: async (row) => {
    const actorId = await getActorId();
    const existing = await loadSiteDetail(pool, row.id);
    if (!existing) {
      return;
    }
    await updateSite(pool, actorId, row);
  },

  delete: async (id) => {
    const actorId = await getActorId();
    await deleteSite(pool, actorId, id);
  },

  getRelated: (siteId) => loadSiteDetailRelated(pool, siteId),

  replaceRelated: async (siteId, related) => {
    const actorId = await getActorId();
    const patch = related as SiteDetailRelatedPatch;

    if (patch.contacts !== undefined) {
      await replaceSiteContacts(pool, actorId, siteId, patch.contacts);
    }

    if (patch.scopes !== undefined) {
      const existing = await loadSiteScopes(pool, siteId);
      await replaceSiteScopes(pool, actorId, siteId, {
        scopes:
          patch.scopes ??
          existing.scopes.map((row) => toScopePatchRow(row)),
      });
    }
  },

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }
    return (await loadSiteDetail(pool, entityId)) !== undefined;
  },
});
