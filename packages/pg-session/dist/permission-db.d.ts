import type { Pool, PoolClient } from "pg";
/** v1 single-company id bound as `app.company_id` (Phase 07 multi-co replaces). */
export declare const LATCH_DEFAULT_COMPANY_ID = "default";
/**
 * Bind request-scoped session vars for the current transaction.
 * Uses `set_config(..., true)` — equivalent to `SET LOCAL`.
 */
export declare const bindPermissionSession: (client: Pick<PoolClient, "query">, principalId: string, companyId?: string) => Promise<void>;
/**
 * Run `fn` inside `BEGIN` / session bind / `COMMIT` on a pooled client.
 * Covers T12 — no actor carry-over across requests on reused connections.
 */
export declare const withPermissionDb: <T>(pool: Pool, principalId: string, fn: (client: PoolClient) => Promise<T>, options?: {
    companyId?: string;
}) => Promise<T>;
//# sourceMappingURL=permission-db.d.ts.map