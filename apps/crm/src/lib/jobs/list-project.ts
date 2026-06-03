import { fieldAllows, type Manifest } from "@latch/contracts";

import type {
  MemoryAssignmentRecord,
  MemoryJobRecord,
} from "../../../db/memory-store.js";

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
  assignments?: { user_id: string }[];
};

const formatTimestamp = (value: Date | null | undefined): string | null =>
  value == null ? null : value.toISOString();

/**
 * Build a Field-keyed list DTO from a job row, assignments, and join columns.
 * Forbidden Fields are omitted entirely (not set to `null`).
 */
export const projectJobListRow = (
  row: MemoryJobRecord,
  manifest: Manifest,
  assignments: MemoryAssignmentRecord[],
  joins: JobListJoins,
): ProjectedJobListRow => {
  const dto: ProjectedJobListRow = { id: row.id };

  if (fieldAllows(manifest, "summary", "read")) {
    dto.summary = {
      id: row.id,
      title: row.title,
      status: row.status,
      scheduled_at: formatTimestamp(row.scheduledAt),
    };
  }

  if (fieldAllows(manifest, "customer_site", "read")) {
    dto.customer_site = {
      name: joins.customerName,
      label: joins.siteLabel,
    };
  }

  if (fieldAllows(manifest, "financial_terms", "read")) {
    dto.financial_terms = {
      contract_amount: row.contractAmount ?? null,
    };
  }

  if (fieldAllows(manifest, "assignments", "read")) {
    dto.assignments = assignments.map((a) => ({ user_id: a.userId }));
  }

  return dto;
};
