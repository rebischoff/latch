import { withPermissionDb } from "@latch/audit";
import { Pool } from "pg";

import { getDatabaseUrl } from "@/lib/db";

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

/** Current global policy version, or `undefined` when Postgres is not configured. */
export const getPolicyVersion = async (
  principalId: string,
): Promise<number | undefined> => {
  const db = queryPool();
  if (!db) {
    return undefined;
  }
  const result = await withPermissionDb(db, principalId, async (client) =>
    client.query<{ version: string }>(
      "SELECT version FROM latch_policy_version WHERE id = 1",
    ),
  );
  const raw = result.rows[0]?.version;
  return raw != null ? Number(raw) : 1;
};

/**
 * Increment `latch_policy_version` after IAM role assign/revoke (v1).
 * No-op when `DATABASE_URL` is unset (in-memory pilot).
 */
export const bumpPolicyVersion = async (
  principalId: string,
): Promise<number | undefined> => {
  const db = queryPool();
  if (!db) {
    return undefined;
  }
  const result = await withPermissionDb(db, principalId, async (client) =>
    client.query<{ version: string }>(
      "UPDATE latch_policy_version SET version = version + 1 WHERE id = 1 RETURNING version",
    ),
  );
  const raw = result.rows[0]?.version;
  return raw != null ? Number(raw) : undefined;
};

/** Vitest: release pool between DB-gated tests. */
export const closePolicyVersionPool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
};
