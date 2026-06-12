/**
 * Audit platform config — read-only seam for global options (see global-options.md).
 * CRM may re-export `retentionYears` from env in a follow-on task.
 */
/** Aligns with global option `auditRetentionYears` (default 3). */
export declare const DEFAULT_AUDIT_RETENTION_YEARS = 3;
export interface AuditConfig {
    /** Years to retain audit rows before operator archive/purge of partitions. */
    retentionYears: number;
}
export declare const DEFAULT_AUDIT_CONFIG: Readonly<AuditConfig>;
/** Current audit config (defaults until `setAuditConfig` or CRM wiring). */
export declare const getAuditConfig: () => Readonly<AuditConfig>;
/** Override audit config (e.g. CRM env at bootstrap). Merges partial into current. */
export declare const setAuditConfig: (partial: Partial<AuditConfig>) => void;
/** Reset to package defaults (tests). */
export declare const resetAuditConfig: () => void;
//# sourceMappingURL=config.d.ts.map