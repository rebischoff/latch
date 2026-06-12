import type { AuditWriter } from "@latch/audit";
import { Pool } from "pg";
export type PostgresAuditWriter = {
    writer: AuditWriter;
    pool: Pool;
    close: () => Promise<void>;
};
/**
 * Append-only INSERT into `latch_audit`. Used when `DATABASE_URL` is set;
 * immutability is enforced by DB triggers (see `009_latch_audit.sql`).
 * Each insert runs in a transaction with `SET LOCAL` actor binding (T12).
 */
export declare const createPostgresAuditWriter: (connectionString: string) => PostgresAuditWriter;
//# sourceMappingURL=postgres-audit-writer.d.ts.map