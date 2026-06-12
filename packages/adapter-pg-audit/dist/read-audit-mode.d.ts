import { type AuditMode } from "@latch/audit";
import type { Pool } from "pg";
/** Read persisted `latch_app_config.audit_mode` (defaults to `full` when missing). */
export declare const readAuditModeFromPool: (pool: Pool) => Promise<AuditMode>;
//# sourceMappingURL=read-audit-mode.d.ts.map