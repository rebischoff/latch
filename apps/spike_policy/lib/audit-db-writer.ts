import type { AuditEntryInput, AuditWriter } from "@latch/audit";
import { withPermissionDb } from "@latch/audit";
import { Pool } from "pg";

export type PostgresAuditWriter = {
  writer: AuditWriter;
  pool: Pool;
  close: () => Promise<void>;
};

/**
 * Append-only INSERT into `latch_audit`. Each write runs in a transaction with
 * `SET LOCAL` actor binding (T12).
 */
export const createPostgresAuditWriter = (
  connectionString: string,
): PostgresAuditWriter => {
  const pool = new Pool({ connectionString });

  const writer: AuditWriter = async (entry: AuditEntryInput) => {
    await withPermissionDb(pool, entry.actorId, async (client) => {
      await client.query(
        `INSERT INTO latch_audit (
          actor_id,
          action,
          module_id,
          entity_type,
          entity_id,
          field_ids,
          before,
          after,
          patch,
          request_id,
          approval_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          entry.actorId,
          entry.action,
          entry.moduleId ?? null,
          entry.tableName,
          entry.recordId,
          entry.fieldIds ?? null,
          entry.before ?? null,
          entry.after ?? null,
          entry.patch ?? null,
          entry.requestId ?? null,
          entry.approvalId ?? null,
        ],
      );
    });
  };

  const close = async (): Promise<void> => {
    await pool.end();
  };

  return { writer, pool, close };
};
