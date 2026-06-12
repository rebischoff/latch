import { type PermissionContext } from "@latch/contracts";
import type { AuditEntryInput, AuditJson } from "./types.js";
/** Persisted audit row — includes stable id for operator replay. */
export type StoredAuditEntry = AuditEntryInput & {
    id: string;
};
export type RestoreFromAuditDeps = {
    getAuditEntry: (auditId: string) => Promise<StoredAuditEntry | null> | StoredAuditEntry | null;
    anchorExists: (tableName: string, recordId: string) => boolean | Promise<boolean>;
    /** INSERT anchor + embedded children from delete `before`; returns `after` audit payload. */
    replay: (input: {
        tableName: string;
        recordId: string;
        before: AuditJson;
    }) => Promise<AuditJson> | AuditJson;
    /** When set, reject restore for unknown `entity_type` / `tableName`. */
    supportedEntityTypes?: string[];
};
/**
 * Privileged replay of a hard delete from an append-only audit row.
 * Caller must pass a {@link PermissionContext} re-resolved for `entry.module_id`.
 */
export declare const restoreFromAuditEntry: (auditId: string, ctx: PermissionContext, deps: RestoreFromAuditDeps) => Promise<void>;
//# sourceMappingURL=restore.d.ts.map