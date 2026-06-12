import { fieldAllows, type Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  JobDetailPatchSchema,
  JobDetailVerificationFieldIds,
} from "../../modules/job/generated/job_detail.schema.generated.js";
import {
  JobListPatchSchema,
  type JobListPatchDto,
} from "../../modules/job/generated/job_list.schema.generated.js";

import type { JobRelated, MemoryJobRecord } from "./schema.js";
import type { MemoryJobStore } from "./store.js";

export const JobListListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().max(200).optional(),
  offset: z.number().int().nonnegative().optional(),
});

const formatScheduledAt = (value: Date | null | undefined): string | null =>
  value?.toISOString() ?? null;

const formatJobAuditSnapshot = (row: MemoryJobRecord): Record<string, unknown> => ({
  title: row.title,
  status: row.status,
  scheduled_at: formatScheduledAt(row.scheduledAt),
  description: row.description,
  contract_amount: row.contractAmount,
  customer_id: row.customerId,
});

const applyJobRowPatch = (
  row: MemoryJobRecord,
  patch: Record<string, unknown>,
): MemoryJobRecord => {
  const next = { ...row, updatedAt: new Date() };
  const listPatch = patch as JobListPatchDto;
  const detailPatch = patch as z.infer<typeof JobDetailPatchSchema>;

  if (listPatch.summary?.title !== undefined) {
    next.title = listPatch.summary.title;
  }
  if (detailPatch.summary?.title !== undefined) {
    next.title = detailPatch.summary.title;
  }
  if (listPatch.summary?.status !== undefined) {
    next.status = listPatch.summary.status;
  }
  if (detailPatch.summary?.status !== undefined) {
    next.status = detailPatch.summary.status;
  }
  const scheduledAtPatch =
    listPatch.summary?.scheduled_at ?? detailPatch.summary?.scheduled_at;
  if (scheduledAtPatch !== undefined) {
    next.scheduledAt =
      scheduledAtPatch === null ? null : new Date(scheduledAtPatch);
  }
  if (detailPatch.scope?.description !== undefined) {
    next.description = detailPatch.scope.description;
  }
  if (listPatch.financial_terms?.contract_amount !== undefined) {
    next.contractAmount = listPatch.financial_terms.contract_amount;
  }
  if (detailPatch.financial_terms?.contract_amount !== undefined) {
    next.contractAmount = detailPatch.financial_terms.contract_amount;
  }

  return next;
};

const projectJobListRow = (
  row: MemoryJobRecord,
  manifest: Manifest,
  related: JobRelated,
  listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (fieldAllows(manifest, "summary", "read")) {
    dto.summary = {
      id: row.id,
      title: row.title,
      status: row.status,
      scheduled_at: formatScheduledAt(row.scheduledAt),
    };
  }

  if (fieldAllows(manifest, "customer_site", "read") && listJoins) {
    dto.customer_site = {
      name: listJoins.customerName as string,
      label: listJoins.siteLabel as string,
    };
  }

  if (fieldAllows(manifest, "financial_terms", "read") && row.contractAmount) {
    dto.financial_terms = {
      contract_amount: row.contractAmount,
    };
  }

  if (fieldAllows(manifest, "assignments", "read")) {
    dto.assignments = related.assignments.map((a) => ({ user_id: a.userId }));
  }

  return dto;
};

const projectJobDetailRow = (
  row: MemoryJobRecord,
  manifest: Manifest,
  related: JobRelated,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (fieldAllows(manifest, "summary", "read")) {
    dto.summary = {
      title: row.title,
      status: row.status,
      scheduled_at: formatScheduledAt(row.scheduledAt),
    };
  }

  if (fieldAllows(manifest, "scope", "read")) {
    dto.scope = {
      description: row.description ?? "",
    };
  }

  if (fieldAllows(manifest, "financial_terms", "read") && row.contractAmount) {
    dto.financial_terms = {
      contract_amount: row.contractAmount,
    };
  }

  if (fieldAllows(manifest, "customer_ref", "read") && related.customer) {
    dto.customer_ref = {
      id: related.customer.id,
      name: related.customer.name,
    };
  }

  if (fieldAllows(manifest, "assignments", "read")) {
    dto.assignments = related.assignments.map((a) => ({ user_id: a.userId }));
  }

  return dto;
};

export const createJobListDescriptor = (
  store: MemoryJobStore,
): SurfaceDescriptor<MemoryJobRecord, JobRelated> => ({
  surfaceId: "job_list",
  anchorTable: "jobs",
  capabilities: ["list"],
  patchSchema: JobListPatchSchema,
  listQuerySchema: JobListListQuerySchema,
  listDefaultPageSize: 50,
  bulkMaxBatch: 200,
  deleteAuditFieldId: "summary",
  projectRow: projectJobListRow,
  applyPatch: applyJobRowPatch,
  applyRelatedPatch: (entityId, patch) => {
    const typed = patch as JobListPatchDto;
    if (typed.assignments === undefined) {
      return undefined;
    }
    return {
      assignments: typed.assignments.map((a) => ({
        jobId: entityId,
        userId: a.user_id,
      })),
      customer: undefined,
    };
  },
  auditSnapshot: formatJobAuditSnapshot,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
  listJoins: (row) => store.getCustomerSiteJoins(row),
});

export const createJobDetailDescriptor = (
  _store: MemoryJobStore,
): SurfaceDescriptor<MemoryJobRecord, JobRelated> => ({
  surfaceId: "job_detail",
  anchorTable: "jobs",
  capabilities: ["detail"],
  patchSchema: JobDetailPatchSchema,
  deleteAuditFieldId: "summary",
  verificationFieldIds: [...JobDetailVerificationFieldIds],
  projectRow: projectJobDetailRow,
  applyPatch: applyJobRowPatch,
  applyRelatedPatch: (entityId, patch) => {
    const typed = patch as z.infer<typeof JobDetailPatchSchema>;
    if (typed.assignments === undefined) {
      return undefined;
    }
    return {
      assignments: typed.assignments.map((a) => ({
        jobId: entityId,
        userId: a.user_id,
      })),
      customer: undefined,
    };
  },
  auditSnapshot: formatJobAuditSnapshot,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
});
