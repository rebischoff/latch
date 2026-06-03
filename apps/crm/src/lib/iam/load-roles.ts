import { listRolesForUser } from "../../../db/store.js";
import type { MemoryJobStore } from "../../../db/memory-store.js";

import { getPilotStore } from "@/lib/pilot-store";

/**
 * Role ids for a user from `latch_user_roles` (memory store or Postgres facade).
 * Empty when the user has no assignments — callers treat as no grants.
 */
export const loadRolesForUser = async (
  userId: string,
  store: MemoryJobStore = getPilotStore(),
): Promise<string[]> => listRolesForUser(store, userId);
