import type { AuditEntryInput } from "./types.js";
export type AuditWriter = (entry: AuditEntryInput) => void | Promise<void>;
export declare const setAuditWriter: (writer: AuditWriter | null) => void;
export declare const writeAudit: (entry: AuditEntryInput) => Promise<void>;
export interface MemoryAuditWriter {
    readonly entries: AuditEntryInput[];
    writer: AuditWriter;
    reset: () => void;
}
/** In-memory writer for unit tests and local dev before the DB writer (task 17). */
export declare const createMemoryAuditWriter: () => MemoryAuditWriter;
//# sourceMappingURL=audit-service.d.ts.map