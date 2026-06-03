import type { StoredAuditEntry } from "@latch/audit";
import type { Pool } from "pg";

/** Load one `latch_audit` row by primary key for operator restore. */
export const fetchAuditEntryById = async (
  pool: Pool,
  auditId: string,
): Promise<StoredAuditEntry | null> => {
  const numericId = Number(auditId);
  if (!Number.isInteger(numericId) || numericId < 1) {
    return null;
  }

  const result = await pool.query<{
    id: string;
    actor_id: string;
    action: string;
    module_id: string | null;
    entity_type: string;
    entity_id: string;
    field_ids: string[] | null;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    patch: Record<string, unknown> | null;
    request_id: string | null;
    approval_id: string | null;
  }>(
    `SELECT
      id::text,
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
    FROM latch_audit
    WHERE id = $1`,
    [numericId],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    actorId: row.actor_id,
    action: row.action as StoredAuditEntry["action"],
    tableName: row.entity_type,
    recordId: row.entity_id,
    moduleId: row.module_id ?? undefined,
    fieldIds: row.field_ids ?? undefined,
    before: row.before,
    after: row.after,
    patch: row.patch,
    requestId: row.request_id ?? undefined,
    approvalId: row.approval_id ?? undefined,
  };
};
