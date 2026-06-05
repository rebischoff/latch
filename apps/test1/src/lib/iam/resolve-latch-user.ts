/**
 * Scaffold (task 05) — raw `pg` + email bridge; shared Drizzle client in task 10+.
 * Email lookup may move to Better Auth Postgres adapter in a later auth task.
 */
import { withPermissionDb } from "@latch/audit";
import { Pool } from "pg";

import { resolveUserIdByEmail } from "../../../db/store.js";
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
 * Maps Better Auth login email → stable `latch_users.id` for `Principal.id`.
 * Falls back to the provider user id when no row exists (empty roles).
 */
export const resolveLatchUserId = async (
  loginEmail: string,
  providerUserId: string,
): Promise<string> => {
  const db = queryPool();
  if (db) {
    const result = await withPermissionDb(db, providerUserId, async (client) =>
      client.query<{ id: string }>(
        "SELECT id FROM latch_users WHERE login_email = $1",
        [loginEmail],
      ),
    );
    return result.rows[0]?.id ?? providerUserId;
  }

  return (
    resolveUserIdByEmail(getTest1Store(), loginEmail) ?? providerUserId
  );
};

/** Vitest: release pool between DB-gated tests. */
export const closeLatchUserPool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
};
