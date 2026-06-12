import type { AuditAction, AuditEntryInput, AuditJson } from "./types.js";
/** Scaffold-time platform config — immutable at runtime (see audit-and-lifecycle.md). */
export type AuditMode = "full" | "standard" | "recovery";
export declare const AUDIT_MODES: readonly AuditMode[];
/** Current audit mode (defaults to `full` until bootstrap or tests call `setAuditMode`). */
export declare const getAuditMode: () => AuditMode;
/** Override audit mode (bootstrap from `latch_app_config` or tests). */
export declare const setAuditMode: (mode: AuditMode) => void;
/** Reset to package default (tests). */
export declare const resetAuditMode: () => void;
export declare const parseAuditMode: (raw: string) => AuditMode;
/** True when `next` is a strict upgrade from `current` (recovery → standard → full). */
export declare const isAuditModeUpgrade: (current: AuditMode, next: AuditMode) => boolean;
export type AuditMutationClass = "insert" | "update" | "delete";
/** Maps audit actions to insert/update/delete classes for mode payload rules. */
export declare const auditMutationClass: (action: AuditAction, patch?: AuditJson | null) => AuditMutationClass;
/**
 * Shape an audit entry for the active mode. Returns `null` when the mode
 * suppresses the write entirely (recovery insert/update classes).
 */
export declare const shapeAuditEntryForMode: (entry: AuditEntryInput, mode: AuditMode) => AuditEntryInput | null;
//# sourceMappingURL=audit-mode.d.ts.map