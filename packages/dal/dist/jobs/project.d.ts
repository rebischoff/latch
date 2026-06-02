import { type Manifest } from "@latch/contracts";
import type { MemoryAssignmentRecord, MemoryJobRecord } from "./memory-store.js";
/** Read DTO for `job_detail` — keys omitted when manifest denies `read`. */
export type ProjectedJobDetail = {
    id: string;
    summary?: {
        title: string;
        status: string;
        scheduled_at: string | null;
    };
    scope?: {
        description: string | null;
    };
    financial_terms?: {
        contract_amount: string | null;
    };
    assignments?: {
        user_id: string;
    }[];
};
/**
 * Build a Field-keyed DTO from a job row and assignments.
 * Forbidden Fields are omitted entirely (not set to `null`).
 */
export declare const projectJobRow: (row: MemoryJobRecord, manifest: Manifest, assignments: MemoryAssignmentRecord[]) => ProjectedJobDetail;
//# sourceMappingURL=project.d.ts.map