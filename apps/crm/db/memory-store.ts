import type {
  AssignmentRow,
  CustomerRow,
  JobRow,
  LatchUserRoleRow,
  LatchUserRow,
  SiteRow,
} from "./schema.js";

export type MemoryCustomerRecord = CustomerRow;

export type MemorySiteRecord = SiteRow;

export type MemoryJobRecord = Omit<JobRow, "createdAt" | "updatedAt"> & {
  createdAt?: Date;
  updatedAt?: Date;
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

export type MemoryUserRoleRecord = LatchUserRoleRow;

export type CustomerSiteJoins = {
  customerName: string;
  siteLabel: string;
};

/**
 * In-memory pilot store for tests and local dev without Postgres.
 */
export class MemoryJobStore {
  readonly users = new Map<string, MemoryUserRecord>();
  /** user id → role ids (mirrors `latch_user_roles`) */
  readonly rolesByUser = new Map<string, string[]>();
  readonly customers = new Map<string, MemoryCustomerRecord>();
  readonly sites = new Map<string, MemorySiteRecord>();
  readonly jobs = new Map<string, MemoryJobRecord>();
  /** job id → assignees */
  readonly assignmentsByJob = new Map<string, MemoryAssignmentRecord[]>();

  clear = (): void => {
    this.users.clear();
    this.rolesByUser.clear();
    this.customers.clear();
    this.sites.clear();
    this.jobs.clear();
    this.assignmentsByJob.clear();
  };

  upsertUser = (user: MemoryUserRecord): void => {
    this.users.set(user.id, {
      ...user,
      createdAt: user.createdAt ?? new Date(),
    });
  };

  getUser = (id: string): MemoryUserRecord | undefined => this.users.get(id);

  listRolesForUser = (userId: string): string[] =>
    [...(this.rolesByUser.get(userId) ?? [])].sort();

  setUserRoles = (userId: string, roleIds: string[]): void => {
    const unique = [...new Set(roleIds)].sort();
    if (unique.length === 0) {
      this.rolesByUser.delete(userId);
      return;
    }
    this.rolesByUser.set(userId, unique);
  };

  addUserRole = (userId: string, roleId: string): void => {
    const current = this.listRolesForUser(userId);
    if (current.includes(roleId)) {
      return;
    }
    this.setUserRoles(userId, [...current, roleId]);
  };

  removeUserRole = (userId: string, roleId: string): void => {
    this.setUserRoles(
      userId,
      this.listRolesForUser(userId).filter((id) => id !== roleId),
    );
  };

  upsertCustomer = (customer: MemoryCustomerRecord): void => {
    this.customers.set(customer.id, { ...customer });
  };

  upsertSite = (site: MemorySiteRecord): void => {
    this.sites.set(site.id, { ...site });
  };

  getCustomer = (id: string): MemoryCustomerRecord | undefined =>
    this.customers.get(id);

  getSite = (id: string): MemorySiteRecord | undefined => this.sites.get(id);

  getSitesForCustomer = (customerId: string): MemorySiteRecord[] =>
    [...this.sites.values()].filter((site) => site.customerId === customerId);

  /** Jobs linked to a customer — `customer_detail` `job_history` Field (DAL join, not a DB view). */
  listJobsByCustomerId = (customerId: string): MemoryJobRecord[] =>
    [...this.jobs.values()].filter((job) => job.customerId === customerId);

  /**
   * Join data for `job_list` `customer_site` Field (`customers.name` + `sites.label`).
   * Uses the first site for the job's customer when multiple exist.
   */
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
