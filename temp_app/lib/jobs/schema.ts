/** Row shapes for the in-memory jobs store (mirror `migrations/014_business_schema.sql`). */

export type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  billingNotes: string | null;
};

export type SiteRow = {
  id: string;
  customerId: string;
  label: string;
};

export type JobRow = {
  id: string;
  title: string;
  status: string;
  scheduledAt: Date | null;
  description: string | null;
  contractAmount: string | null;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AssignmentRow = {
  jobId: string;
  userId: string;
};

export type MemoryJobRecord = Omit<JobRow, "createdAt" | "updatedAt"> & {
  createdAt?: Date;
  updatedAt?: Date;
};

export type MemoryAssignmentRecord = AssignmentRow;

export type JobRelated = {
  assignments: MemoryAssignmentRecord[];
  customer?: CustomerRow;
};

export type CustomerSiteJoins = {
  customerName: string;
  siteLabel: string;
};
