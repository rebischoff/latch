import { parseAuditMode, type AuditMode } from "@latch/audit";
import type { Pool } from "pg";

/** Read persisted `latch_app_config.audit_mode` (defaults to `full` when missing). */
export const readAuditModeFromPool = async (pool: Pool): Promise<AuditMode> => {
  const result = await pool.query<{ audit_mode: string }>(
    `SELECT audit_mode FROM latch_app_config WHERE id = 1`,
  );
  const raw = result.rows[0]?.audit_mode;
  if (raw === undefined) {
    return "full";
  }
  return parseAuditMode(raw);
};
