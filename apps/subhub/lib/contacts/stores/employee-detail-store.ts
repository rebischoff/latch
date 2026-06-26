import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type {
  EmployeeDetailRow,
  EmployeeDetailStoreRelated,
  EmployeeDetailRelatedPatch,
} from "../descriptors/employee-detail";
import {
  loadEmployeeDetail,
  loadEmployeeDetailRelated,
} from "../repository/employee-write";
import { loadEmployeeList } from "../repository/employee";
import {
  deleteEmployeeParty,
  employeePartyHasLens,
  replaceEmployeeEmails,
  updateEmployeeParty,
} from "../repository/employee-write";
import { replacePartyPhones } from "../repository";

export const createEmployeeDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
): StoreAdapter<EmployeeDetailRow, EmployeeDetailStoreRelated> => ({
  get: (id) => loadEmployeeDetail(pool, id),

  list: async () => ({ rows: [], total: 0 }),

  upsert: async (row) => {
    const actorId = await getActorId();
    const existing = await loadEmployeeDetail(pool, row.id);
    if (!existing) {
      return;
    }

    await updateEmployeeParty(pool, actorId, row);
  },

  delete: async (id) => {
    const actorId = await getActorId();
    await deleteEmployeeParty(pool, actorId, id);
  },

  getRelated: (partyId) => loadEmployeeDetailRelated(pool, partyId),

  replaceRelated: async (partyId, related) => {
    const actorId = await getActorId();
    const patch = related as EmployeeDetailRelatedPatch;

    if (patch.phones !== undefined) {
      await replacePartyPhones(pool, actorId, partyId, patch.phones);
    }

    if (patch.emails !== undefined) {
      await replaceEmployeeEmails(pool, actorId, partyId, patch.emails);
    }
  },

  isRowVisibleToPrincipal: async (entityId, _principalId, rowScope) => {
    if (rowScope === "own" || rowScope === "scope") {
      return false;
    }

    const row = await loadEmployeeDetail(pool, entityId);
    if (!row) {
      return false;
    }

    return employeePartyHasLens(pool, entityId);
  },
});
