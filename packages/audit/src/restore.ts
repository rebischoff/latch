import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  surfaceAllows,
  type PermissionContext,
} from "@latch/contracts";

import { writeAudit } from "./audit-service.js";
import type { AuditEntryInput, AuditJson } from "./types.js";

/** Persisted audit row — includes stable id for operator replay. */
export type StoredAuditEntry = AuditEntryInput & { id: string };

export type RestoreFromAuditDeps = {
  getAuditEntry: (
    auditId: string,
  ) => Promise<StoredAuditEntry | null> | StoredAuditEntry | null;
  anchorExists: (
    tableName: string,
    recordId: string,
  ) => boolean | Promise<boolean>;
  /** INSERT anchor + embedded children from delete `before`; returns `after` audit payload. */
  replay: (input: {
    tableName: string;
    recordId: string;
    before: AuditJson;
  }) => Promise<AuditJson> | AuditJson;
  /** When set, reject restore for unknown `entity_type` / `tableName`. */
  supportedEntityTypes?: string[];
};

const assertEligibleDeleteEntry = (
  entry: StoredAuditEntry,
  supportedEntityTypes?: string[],
): void => {
  if (entry.action !== "delete") {
    throw new ValidationError(
      `Restore requires a delete audit row (got ${entry.action})`,
    );
  }
  if (entry.before == null) {
    throw new ValidationError("Restore requires a non-null delete before snapshot");
  }
  if (
    supportedEntityTypes !== undefined &&
    !supportedEntityTypes.includes(entry.tableName)
  ) {
    throw new ValidationError(
      `Restore is not supported for entity_type ${entry.tableName}`,
    );
  }
};

const assertRestoreAuthorized = (
  entry: StoredAuditEntry,
  ctx: PermissionContext,
): void => {
  if (entry.moduleId !== undefined && entry.moduleId !== ctx.surface) {
    throw new ForbiddenError(
      "Permission context surface does not match audit module_id",
    );
  }
  if (!surfaceAllows(ctx.manifest, "restore")) {
    throw new ForbiddenError("Restore action not granted on this Surface");
  }
};

/**
 * Privileged replay of a hard delete from an append-only audit row.
 * Caller must pass a {@link PermissionContext} re-resolved for `entry.module_id`.
 */
export const restoreFromAuditEntry = async (
  auditId: string,
  ctx: PermissionContext,
  deps: RestoreFromAuditDeps,
): Promise<void> => {
  const entry = await deps.getAuditEntry(auditId);
  if (entry === null) {
    throw new NotFoundError(`Audit entry not found: ${auditId}`);
  }

  assertEligibleDeleteEntry(entry, deps.supportedEntityTypes);
  assertRestoreAuthorized(entry, ctx);

  if (await deps.anchorExists(entry.tableName, entry.recordId)) {
    throw new ConflictError(
      `Live row already exists for ${entry.tableName} ${entry.recordId}`,
    );
  }

  const after = await deps.replay({
    tableName: entry.tableName,
    recordId: entry.recordId,
    before: entry.before as AuditJson,
  });

  await writeAudit({
    actorId: ctx.principal.id,
    action: "restore",
    tableName: entry.tableName,
    recordId: entry.recordId,
    moduleId: entry.moduleId ?? ctx.surface,
    fieldIds: entry.fieldIds,
    before: null,
    after,
  });
};
