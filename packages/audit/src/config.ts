/**
 * Audit platform config — read-only seam for global options (see global-options.md).
 * CRM may re-export `retentionYears` from env in a follow-on task.
 */

/** Aligns with global option `auditRetentionYears` (default 3). */
export const DEFAULT_AUDIT_RETENTION_YEARS = 3;

export interface AuditConfig {
  /** Years to retain audit rows before operator archive/purge of partitions. */
  retentionYears: number;
}

export const DEFAULT_AUDIT_CONFIG: Readonly<AuditConfig> = {
  retentionYears: DEFAULT_AUDIT_RETENTION_YEARS,
};

let activeConfig: AuditConfig = { ...DEFAULT_AUDIT_CONFIG };

/** Current audit config (defaults until `setAuditConfig` or CRM wiring). */
export const getAuditConfig = (): Readonly<AuditConfig> => activeConfig;

/** Override audit config (e.g. CRM env at bootstrap). Merges partial into current. */
export const setAuditConfig = (partial: Partial<AuditConfig>): void => {
  activeConfig = { ...activeConfig, ...partial };
};

/** Reset to package defaults (tests). */
export const resetAuditConfig = (): void => {
  activeConfig = { ...DEFAULT_AUDIT_CONFIG };
};
