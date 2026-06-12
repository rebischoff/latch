import type { AuditAction, AuditEntryInput, AuditJson } from "./types.js";

/** Scaffold-time platform config — immutable at runtime (see audit-and-lifecycle.md). */
export type AuditMode = "full" | "standard" | "recovery";

export const AUDIT_MODES: readonly AuditMode[] = [
  "full",
  "standard",
  "recovery",
] as const;

const AUDIT_MODE_RANK: Record<AuditMode, number> = {
  recovery: 0,
  standard: 1,
  full: 2,
};

let activeMode: AuditMode = "full";

/** Current audit mode (defaults to `full` until bootstrap or tests call `setAuditMode`). */
export const getAuditMode = (): AuditMode => activeMode;

/** Override audit mode (bootstrap from `latch_app_config` or tests). */
export const setAuditMode = (mode: AuditMode): void => {
  activeMode = mode;
};

/** Reset to package default (tests). */
export const resetAuditMode = (): void => {
  activeMode = "full";
};

export const parseAuditMode = (raw: string): AuditMode => {
  if ((AUDIT_MODES as readonly string[]).includes(raw)) {
    return raw as AuditMode;
  }
  throw new Error(
    `Invalid audit mode "${raw}". Expected one of: ${AUDIT_MODES.join(", ")}`,
  );
};

/** True when `next` is a strict upgrade from `current` (recovery → standard → full). */
export const isAuditModeUpgrade = (
  current: AuditMode,
  next: AuditMode,
): boolean => AUDIT_MODE_RANK[next] > AUDIT_MODE_RANK[current];

export type AuditMutationClass = "insert" | "update" | "delete";

/** Maps audit actions to insert/update/delete classes for mode payload rules. */
export const auditMutationClass = (
  action: AuditAction,
  patch?: AuditJson | null,
): AuditMutationClass => {
  if (action === "insert" || action === "restore") {
    return "insert";
  }
  if (action === "delete") {
    return "delete";
  }
  if (action === "bulk_summary") {
    return patch != null &&
      typeof patch === "object" &&
      "operation" in patch &&
      patch.operation === "delete"
      ? "delete"
      : "update";
  }
  return "update";
};

const metadataOnlyEntry = (entry: AuditEntryInput): AuditEntryInput => ({
  actorId: entry.actorId,
  action: entry.action,
  tableName: entry.tableName,
  recordId: entry.recordId,
  ...(entry.moduleId !== undefined ? { moduleId: entry.moduleId } : {}),
  ...(entry.fieldIds !== undefined ? { fieldIds: entry.fieldIds } : {}),
  ...(entry.requestId !== undefined ? { requestId: entry.requestId } : {}),
  ...(entry.approvalId !== undefined ? { approvalId: entry.approvalId } : {}),
});

/**
 * Shape an audit entry for the active mode. Returns `null` when the mode
 * suppresses the write entirely (recovery insert/update classes).
 */
export const shapeAuditEntryForMode = (
  entry: AuditEntryInput,
  mode: AuditMode,
): AuditEntryInput | null => {
  const mutationClass = auditMutationClass(entry.action, entry.patch);

  if (mode === "full") {
    return entry;
  }

  if (mode === "recovery") {
    if (mutationClass === "delete") {
      return {
        ...entry,
        after: null,
        patch: null,
      };
    }
    return null;
  }

  // standard — insert: metadata only; update/delete unchanged
  if (mutationClass === "insert") {
    return metadataOnlyEntry(entry);
  }

  return entry;
};
