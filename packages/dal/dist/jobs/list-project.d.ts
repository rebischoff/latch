import { type Manifest } from "@latch/contracts";
import type { MemoryAssignmentRecord, MemoryJobRecord } from "./memory-store.js";
/** Join data for `customer_site` on `job_list`. */
export type JobListJoins = {
    customerName: string;
    siteLabel: string;
};
/** Read DTO for `job_list` — keys omitted when manifest denies `read`. */
export type ProjectedJobListRow = {
    id: string;
    summary?: {
        id: string;
        title: string;
        status: string;
        scheduled_at: string | null;
    };
    customer_site?: {
        name: string;
        label: string;
    };
    financial_terms?: {
        contract_amount: string | null;
    };
    assignments?: {
        user_id: string;
    }[];
};
/**
 * Build a Field-keyed list DTO from a job row, assignments, and join columns.
 * Forbidden Fields are omitted entirely (not set to `null`).
 */
export declare const projectJobListRow: (row: MemoryJobRecord, manifest: Manifest, assignments: MemoryAssignmentRecord[], joins: JobListJoins) => ProjectedJobListRow;
//# sourceMappingURL=list-project.d.ts.map