/** Actions aligned with `latch_audit.action` (see audit-and-lifecycle.md). */
export type AuditAction =
  | "insert"
  | "update"
  | "delete"
  | "restore"
  | "approve"
  | "reject"
  | "bulk_summary";

export type AuditJson = Record<string, unknown>;

/** Input for append-only audit writes — maps to `latch_audit` columns at insert time. */
export interface AuditEntryInput {
  actorId: string;
  action: AuditAction;
  /** Business table name (`latch_audit.entity_type`). */
  tableName: string;
  /** Primary key as text (`latch_audit.entity_id`). */
  recordId: string;
  before?: AuditJson | null;
  after?: AuditJson | null;
  requestId?: string;
  approvalId?: string;
  /** Surface / module scope (`latch_audit.module_id`). */
  moduleId?: string;
  fieldIds?: string[];
  patch?: AuditJson | null;
}
