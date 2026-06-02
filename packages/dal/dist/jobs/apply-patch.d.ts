import type { MemoryAssignmentRecord, MemoryJobRecord } from "./memory-store.js";
import type { JobDetailPatchDto, JobListPatchDto } from "./schemas.js";
/** Field ids present in a parsed PATCH body (top-level keys only). */
export declare const patchedFieldIds: (patch: JobDetailPatchDto | JobListPatchDto) => string[];
/**
 * Apply a manifest-narrowed PATCH to an in-memory job row.
 * Nested Field keys map to `jobs` columns per `job_detail.surface.yaml`.
 */
export declare const applyJobPatch: (row: MemoryJobRecord, patch: JobDetailPatchDto | JobListPatchDto) => MemoryJobRecord;
export declare const applyAssignmentsPatch: (jobId: string, patch: JobDetailPatchDto | JobListPatchDto) => MemoryAssignmentRecord[] | undefined;
/** Column-level snapshot for audit `before` / `after`. */
export declare const jobRowAuditSnapshot: (row: MemoryJobRecord) => Record<string, unknown>;
//# sourceMappingURL=apply-patch.d.ts.map