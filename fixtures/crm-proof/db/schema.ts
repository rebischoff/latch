/** Row shapes for the CRM proof fixture (mirror `fixtures/crm-proof/migrations/*.sql`). */

export type LatchUserRow = {
  id: string;
  displayName: string;
  createdAt: Date;
};

export type LatchUserRoleRow = {
  userId: string;
  roleId: string;
};

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
