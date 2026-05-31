import type { MemoryAssignmentRecord, MemoryJobRecord } from "./memory-store.js";
import type { JobDetailPatchDto } from "./schemas.js";

/** Field ids present in a parsed PATCH body (top-level keys only). */
export const patchedFieldIds = (patch: JobDetailPatchDto): string[] =>
  Object.keys(patch);

const parseScheduledAt = (value: string | null): Date | null =>
  value == null ? null : new Date(value);

/**
 * Apply a manifest-narrowed PATCH to an in-memory job row.
 * Nested Field keys map to `jobs` columns per `job_detail.surface.yaml`.
 */
export const applyJobPatch = (
  row: MemoryJobRecord,
  patch: JobDetailPatchDto,
): MemoryJobRecord => {
  const next: MemoryJobRecord = { ...row, updatedAt: new Date() };

  if (patch.summary) {
    if (patch.summary.title !== undefined) {
      next.title = patch.summary.title;
    }
    if (patch.summary.status !== undefined) {
      next.status = patch.summary.status;
    }
    if (patch.summary.scheduled_at !== undefined) {
      next.scheduledAt = parseScheduledAt(patch.summary.scheduled_at);
    }
  }

  if (patch.scope?.description !== undefined) {
    next.description = patch.scope.description;
  }

  if (patch.financial_terms?.contract_amount !== undefined) {
    next.contractAmount = patch.financial_terms.contract_amount;
  }

  return next;
};

export const applyAssignmentsPatch = (
  jobId: string,
  patch: JobDetailPatchDto,
): MemoryAssignmentRecord[] | undefined => {
  if (patch.assignments === undefined) {
    return undefined;
  }
  return patch.assignments.map((a) => ({ jobId, userId: a.user_id }));
};

/** Column-level snapshot for audit `before` / `after`. */
export const jobRowAuditSnapshot = (
  row: MemoryJobRecord,
): Record<string, unknown> => ({
  title: row.title,
  status: row.status,
  scheduled_at: row.scheduledAt?.toISOString() ?? null,
  description: row.description ?? null,
  contract_amount: row.contractAmount ?? null,
});
