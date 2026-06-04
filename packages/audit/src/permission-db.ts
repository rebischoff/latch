import type { Pool, PoolClient } from "pg";

/** v1 single-company id bound as `app.company_id` (Phase 07 multi-co replaces). */
export const LATCH_DEFAULT_COMPANY_ID = "default";

/**
 * Bind request-scoped session vars for the current transaction.
 * Uses `set_config(..., true)` — equivalent to `SET LOCAL`.
 */
export const bindPermissionSession = async (
  client: Pick<PoolClient, "query">,
  principalId: string,
  companyId: string = LATCH_DEFAULT_COMPANY_ID,
): Promise<void> => {
  await client.query(`SELECT set_config('app.principal_id', $1, true)`, [principalId]);
  await client.query(`SELECT set_config('app.company_id', $1, true)`, [companyId]);
};

/**
 * Run `fn` inside `BEGIN` / session bind / `COMMIT` on a pooled client.
 * Covers T12 — no actor carry-over across requests on reused connections.
 */
export const withPermissionDb = async <T>(
  pool: Pool,
  principalId: string,
  fn: (client: PoolClient) => Promise<T>,
  options?: { companyId?: string },
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await bindPermissionSession(
      client,
      principalId,
      options?.companyId ?? LATCH_DEFAULT_COMPANY_ID,
    );
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failure on broken connection
    }
    throw err;
  } finally {
    client.release();
  }
};
