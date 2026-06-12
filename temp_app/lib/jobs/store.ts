import type {
  AssignmentRow,
  CustomerRow,
  CustomerSiteJoins,
  MemoryAssignmentRecord,
  MemoryJobRecord,
  SiteRow,
} from "./schema.js";

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

/**
 * In-memory pilot store for local dev without a Postgres job DAL (Phase 07).
 */
export class MemoryJobStore {
  readonly customers = new Map<string, CustomerRow>();
  readonly sites = new Map<string, SiteRow>();
  readonly jobs = new Map<string, MemoryJobRecord>();
  readonly assignmentsByJob = new Map<string, MemoryAssignmentRecord[]>();

  clear = (): void => {
    this.customers.clear();
    this.sites.clear();
    this.jobs.clear();
    this.assignmentsByJob.clear();
  };

  upsertCustomer = (customer: CustomerRow): void => {
    this.customers.set(customer.id, { ...customer });
  };

  upsertSite = (site: SiteRow): void => {
    this.sites.set(site.id, { ...site });
  };

  getCustomer = (id: string): CustomerRow | undefined => this.customers.get(id);

  getSitesForCustomer = (customerId: string): SiteRow[] =>
    [...this.sites.values()].filter((site) => site.customerId === customerId);

  getCustomerSiteJoins = (job: MemoryJobRecord): CustomerSiteJoins => {
    const customer = this.getCustomer(job.customerId);
    const site = this.getSitesForCustomer(job.customerId)[0];
    return {
      customerName: customer?.name ?? "",
      siteLabel: site?.label ?? "",
    };
  };

  upsertJob = (job: MemoryJobRecord): void => {
    const now = new Date();
    this.jobs.set(job.id, {
      ...job,
      createdAt: job.createdAt ?? now,
      updatedAt: job.updatedAt ?? now,
    });
  };

  addAssignment = (assignment: AssignmentRow): void => {
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
