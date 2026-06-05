/**
 * Scaffold (task 05) — raw `pg` Pool here; consolidate into shared Drizzle client (task 10+).
 * Memory branch removed when test1 is Postgres-only.
 */
import { withPermissionDb } from "@latch/audit";
import { Pool } from "pg";

import { listRolesForUser } from "../../../db/store.js";
import type { MemoryUserStore } from "../../../db/memory-store.js";
import { getDatabaseUrl } from "../db";
import { getTest1Store } from "../test1-store";

let pool: Pool | undefined;

const queryPool = (): Pool | undefined => {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    return undefined;
  }
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
};

/**
 * Role ids for a user from `latch_user_roles` (Postgres when configured, else memory store).
 * Empty when the user has no assignments — callers treat as no grants.
 */
export const loadRolesForUser = async (
  latchUserId: string,
  store: MemoryUserStore = getTest1Store(),
): Promise<string[]> => {
  const db = queryPool();
  if (db) {
    const result = await withPermissionDb(db, latchUserId, async (client) =>
      client.query<{ role_id: string }>(
        "SELECT role_id FROM latch_user_roles WHERE user_id = $1 ORDER BY role_id",
        [latchUserId],
      ),
    );
    return result.rows.map((row) => row.role_id);
  }

  return listRolesForUser(store, latchUserId).toSorted();
};

/** Vitest: release pool between DB-gated tests. */
export const closeLoadRolesPool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
};
