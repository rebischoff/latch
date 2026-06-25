import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type {
  ManufacturerDetailRow,
  ManufacturerDetailStoreRelated,
} from "../descriptors/manufacturer-detail";
import type { ManufacturerDetailRelatedPatch } from "../descriptors/manufacturer-detail";
import {
  loadManufacturerDetail,
  loadManufacturerDetailRelated,
} from "../repository/manufacturer";
import { updateManufacturerParty } from "../repository/manufacturer-write";
import {
  deleteManufacturerParty,
  partyHasRole,
  replacePartyEmails,
  replacePartyPhones,
} from "../repository";

export const createManufacturerDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<ManufacturerDetailRow, ManufacturerDetailStoreRelated> => ({
  get: (id) => loadManufacturerDetail(pool, id),

  list: async () => ({ rows: [], total: 0 }),

  upsert: async (row) => {
    const actorId = await getActorId();
    const existing = await loadManufacturerDetail(pool, row.id);
    if (!existing) {
      return;
    }

    await updateManufacturerParty(pool, actorId, row, existing);
  },

  delete: async (id) => {
    const actorId = await getActorId();
    await deleteManufacturerParty(pool, actorId, id);
  },

  getRelated: (partyId) => loadManufacturerDetailRelated(pool, partyId),

  replaceRelated: async (partyId, related) => {
    const actorId = await getActorId();
    const patch = related as ManufacturerDetailRelatedPatch;

    if (patch.phones !== undefined) {
      await replacePartyPhones(pool, actorId, partyId, patch.phones);
    }

    if (patch.emails !== undefined) {
      await replacePartyEmails(pool, actorId, partyId, patch.emails);
    }
  },

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }

    const row = await loadManufacturerDetail(pool, entityId);
    if (!row) {
      return false;
    }

    return partyHasRole(pool, entityId, "manufacturer");
  },
});
