import type { PendingChange } from "@latch/approval";
import { fieldAllows, type Manifest } from "@latch/contracts";

import type {
  MemoryAssignmentRecord,
  MemoryJobRecord,
} from "../../../db/memory-store.js";

/** Open verification bundle exposed to submitter or reviewer on `job_detail`. */
export type JobDetailVerificationPending = {
  id: string;
  financial_terms: {
    contract_amount: string | null;
  };
};

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
  customer_ref?: {
    id: string;
    name: string;
  };
  verification_pending?: JobDetailVerificationPending;
};

const formatTimestamp = (value: Date | null | undefined): string | null =>
  value == null ? null : value.toISOString();

const pendingVisibleToPrincipal = (
  manifest: Manifest,
  pending: PendingChange,
  principalId: string,
): boolean => {
  if (pending.submittedBy === principalId) {
    return pending.fieldIds.some((fieldId) =>
      fieldAllows(manifest, fieldId, "submit"),
    );
  }
  return pending.fieldIds.some((fieldId) =>
    fieldAllows(manifest, fieldId, "approve"),
  );
};

const normalizePendingPatch = (
  patch: unknown,
): { financial_terms?: { contract_amount?: string | null } } => {
  if (typeof patch === "string") {
    try {
      return JSON.parse(patch) as {
        financial_terms?: { contract_amount?: string | null };
      };
    } catch {
      return {};
    }
  }
  return (patch ?? {}) as {
    financial_terms?: { contract_amount?: string | null };
  };
};

const formatContractAmount = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return value.trim() === "" ? null : value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return String(value);
};

const verificationPendingFromChange = (
  pending: PendingChange,
): JobDetailVerificationPending | undefined => {
  if (!pending.fieldIds.includes("financial_terms")) {
    return undefined;
  }
  const patch = normalizePendingPatch(pending.patch);
  return {
    id: pending.id,
    financial_terms: {
      contract_amount: formatContractAmount(
        patch.financial_terms?.contract_amount,
      ),
    },
  };
};

/**
 * Role-split pending overlay (Phase 05): submitter sees proposed values;
 * reviewer sees `verification_pending` for accept/reject; others unchanged.
 */
export const overlayJobDetailVerificationPending = (
  dto: ProjectedJobDetail,
  manifest: Manifest,
  principalId: string,
  pending: PendingChange | undefined,
): ProjectedJobDetail => {
  if (!pending || pending.status !== "submitted") {
    return dto;
  }
  if (!pendingVisibleToPrincipal(manifest, pending, principalId)) {
    return dto;
  }

  const verification_pending = verificationPendingFromChange(pending);
  if (!verification_pending) {
    return dto;
  }

  const isSubmitter =
    pending.submittedBy === principalId &&
    fieldAllows(manifest, "financial_terms", "submit") &&
    !fieldAllows(manifest, "financial_terms", "write");

  if (isSubmitter) {
    return {
      ...dto,
      financial_terms: { ...verification_pending.financial_terms },
      verification_pending,
    };
  }

  return { ...dto, verification_pending };
};

/**
 * Build a Field-keyed DTO from a job row and assignments.
 * Forbidden Fields are omitted entirely (not set to `null`).
 */
export type CustomerRefJoin = { id: string; name: string };

export const projectJobRow = (
  row: MemoryJobRecord,
  manifest: Manifest,
  assignments: MemoryAssignmentRecord[],
  customerRef?: CustomerRefJoin,
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

  if (fieldAllows(manifest, "customer_ref", "read") && customerRef) {
    dto.customer_ref = customerRef;
  }

  return dto;
};
