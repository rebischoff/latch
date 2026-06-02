import type { AssignmentRow, JobRow, LatchUserRow } from "../schema.js";
export type MemoryJobRecord = Omit<JobRow, "createdAt" | "updatedAt"> & {
    createdAt?: Date;
    updatedAt?: Date;
    /** Pilot join columns for `job_list` `customer_site` Field. */
    customerName?: string;
    siteLabel?: string;
};
export type ListJobsOpts = {
    principalId: string;
    rowScope: "own" | "all";
    status?: string;
    limit: number;
    offset: number;
};
export type ListJobsResult = {
    rows: MemoryJobRecord[];
    total: number;
};
export type MemoryAssignmentRecord = AssignmentRow;
export type MemoryUserRecord = Omit<LatchUserRow, "createdAt"> & {
    createdAt?: Date;
};
/**
 * In-memory pilot store for tests and local dev without Postgres.
 * DAL read/write (tasks 09+) will target this until a DB adapter is wired.
 */
export declare class MemoryJobStore {
    readonly users: Map<string, MemoryUserRecord>;
    readonly jobs: Map<string, MemoryJobRecord>;
    /** job id → assignees */
    readonly assignmentsByJob: Map<string, {
        jobId: string;
        userId: string;
    }[]>;
    clear: () => void;
    upsertUser: (user: MemoryUserRecord) => void;
    upsertJob: (job: MemoryJobRecord) => void;
    addAssignment: (assignment: MemoryAssignmentRecord) => void;
    getJob: (id: string) => MemoryJobRecord | undefined;
    deleteJob: (id: string) => void;
    replaceAssignmentsForJob: (jobId: string, assignments: MemoryAssignmentRecord[]) => void;
    getAssignmentsForJob: (jobId: string) => MemoryAssignmentRecord[];
    isUserAssignedToJob: (jobId: string, userId: string) => boolean;
    listJobs: (opts: ListJobsOpts) => ListJobsResult;
}
//# sourceMappingURL=memory-store.d.ts.map