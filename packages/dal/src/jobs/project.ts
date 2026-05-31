import { fieldAllows, type Manifest } from "@latch/contracts";

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
  assignments?: { user_id: string }[];
};

const formatTimestamp = (value: Date | null | undefined): string | null =>
  value == null ? null : value.toISOString();

/**
 * Build a Field-keyed DTO from a job row and assignments.
 * Forbidden Fields are omitted entirely (not set to `null`).
 */
export const projectJobRow = (
  row: MemoryJobRecord,
  manifest: Manifest,
  assignments: MemoryAssignmentRecord[],
): ProjectedJobDetail => {
  const dto: ProjectedJobDetail = { id: row.id };

  if (fieldAllows(manifest, "summary", "read")) {
    dto.summary = {
      title: row.title,
      status: row.status,
      scheduled_at: formatTimestamp(row.scheduledAt),
    };
  }

  if (fieldAllows(manifest, "scope", "read")) {
    dto.scope = {
      description: row.description ?? null,
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
