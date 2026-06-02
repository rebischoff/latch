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
export class MemoryJobStore {
  readonly users = new Map<string, MemoryUserRecord>();
  readonly jobs = new Map<string, MemoryJobRecord>();
  /** job id → assignees */
  readonly assignmentsByJob = new Map<string, MemoryAssignmentRecord[]>();

  clear = (): void => {
    this.users.clear();
    this.jobs.clear();
    this.assignmentsByJob.clear();
  };

  upsertUser = (user: MemoryUserRecord): void => {
    this.users.set(user.id, {
      ...user,
      createdAt: user.createdAt ?? new Date(),
    });
  };

  upsertJob = (job: MemoryJobRecord): void => {
    const now = new Date();
    this.jobs.set(job.id, {
      ...job,
      createdAt: job.createdAt ?? now,
      updatedAt: job.updatedAt ?? now,
    });
  };

  addAssignment = (assignment: MemoryAssignmentRecord): void => {
    const list = this.assignmentsByJob.get(assignment.jobId) ?? [];
    if (!list.some((a) => a.userId === assignment.userId)) {
      list.push(assignment);
    }
    this.assignmentsByJob.set(assignment.jobId, list);
  };

  getJob = (id: string): MemoryJobRecord | undefined => this.jobs.get(id);

  deleteJob = (id: string): void => {
    this.jobs.delete(id);
    this.assignmentsByJob.delete(id);
  };

  replaceAssignmentsForJob = (
    jobId: string,
    assignments: MemoryAssignmentRecord[],
  ): void => {
    this.assignmentsByJob.set(jobId, [...assignments]);
  };

  getAssignmentsForJob = (jobId: string): MemoryAssignmentRecord[] =>
    this.assignmentsByJob.get(jobId) ?? [];

  isUserAssignedToJob = (jobId: string, userId: string): boolean =>
    this.getAssignmentsForJob(jobId).some((a) => a.userId === userId);

  listJobs = (opts: ListJobsOpts): ListJobsResult => {
    let rows = [...this.jobs.values()];

    if (opts.rowScope === "own") {
      rows = rows.filter((job) =>
        this.isUserAssignedToJob(job.id, opts.principalId),
      );
    }

    if (opts.status !== undefined) {
      rows = rows.filter((job) => job.status === opts.status);
    }

    rows.sort((a, b) => {
      const aMs = a.scheduledAt?.getTime() ?? 0;
      const bMs = b.scheduledAt?.getTime() ?? 0;
      return aMs - bMs;
    });

    const total = rows.length;
    const page = rows.slice(opts.offset, opts.offset + opts.limit);
    return { rows: page, total };
  };
}
