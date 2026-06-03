import { fieldAllows, surfaceAllows, type PermissionContext } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";

import type {
  MemoryAssignmentRecord,
  MemoryJobRecord,
  MemoryJobStore,
} from "../../../db/memory-store.js";
import {
  applyAssignmentsPatch,
  applyJobPatch,
  jobDeleteAuditSnapshot,
  jobRowAuditSnapshot,
} from "./apply-patch.js";
import { projectJobListRow } from "./list-project.js";
import { projectJobRow } from "./project.js";
import type { JobDetailPatchDto } from "./schemas.js";
import {
  BULK_MAX_BATCH,
  JobDetailPatchSchema,
  JobListPatchSchema,
  JobListQuerySchema,
  LIST_DEFAULT_PAGE_SIZE,
} from "./schemas.js";

const canDeleteJob = (ctx: PermissionContext): boolean =>
  surfaceAllows(ctx.manifest, "delete") ||
  fieldAllows(ctx.manifest, "summary", "delete");

export const createJobListJoins =
  (store: MemoryJobStore) =>
  (row: MemoryJobRecord): Record<string, unknown> => {
    const joins = store.getCustomerSiteJoins(row);
    return {
      customerName: joins.customerName,
      siteLabel: joins.siteLabel,
    };
  };

export const createJobDetailDescriptor = (
  store: MemoryJobStore,
): SurfaceDescriptor<MemoryJobRecord, MemoryAssignmentRecord[]> => ({
  surfaceId: "job_detail",
  anchorTable: "jobs",
  capabilities: ["detail"],
  patchSchema: JobDetailPatchSchema,
  deleteAuditFieldId: "summary",
  projectRow: (row, manifest, assignments) => {
    const customer = store.getCustomer(row.customerId);
    const customerRef = customer
      ? { id: customer.id, name: customer.name }
      : undefined;
    return projectJobRow(row, manifest, assignments, customerRef);
  },
  applyPatch: (row, patch) =>
    applyJobPatch(row, patch as JobDetailPatchDto),
  applyRelatedPatch: (entityId, patch) =>
    applyAssignmentsPatch(entityId, patch as JobDetailPatchDto),
  auditSnapshot: jobRowAuditSnapshot,
  deleteAuditSnapshot: jobDeleteAuditSnapshot,
  canDelete: canDeleteJob,
  pendingWrite: {
    test: (ctx, patch) => {
      const typed = patch as JobDetailPatchDto;
      return (
        typed.financial_terms?.contract_amount !== undefined &&
        !fieldAllows(ctx.manifest, "financial_terms", "write") &&
        fieldAllows(ctx.manifest, "financial_terms", "submit")
      );
    },
    fieldIds: ["financial_terms"],
    extractPendingPatch: (patch) => {
      const typed = patch as JobDetailPatchDto;
      return { financial_terms: typed.financial_terms };
    },
    stripFromDirectPatch: (patch) => {
      const typed = patch as JobDetailPatchDto;
      const { financial_terms: _, ...rest } = typed;
      void _;
      return rest;
    },
  },
});

export const createJobListDescriptor = (
  store: MemoryJobStore,
): SurfaceDescriptor<MemoryJobRecord, MemoryAssignmentRecord[]> => ({
  surfaceId: "job_list",
  anchorTable: "jobs",
  capabilities: ["list"],
  patchSchema: JobListPatchSchema,
  listQuerySchema: JobListQuerySchema,
  listDefaultPageSize: LIST_DEFAULT_PAGE_SIZE,
  bulkMaxBatch: BULK_MAX_BATCH,
  deleteAuditFieldId: "summary",
  projectRow: (row, manifest, assignments, listJoins) =>
    projectJobListRow(row, manifest, assignments, {
      customerName: (listJoins?.customerName as string) ?? "",
      siteLabel: (listJoins?.siteLabel as string) ?? "",
    }),
  applyPatch: (row, patch) => applyJobPatch(row, patch),
  applyRelatedPatch: (entityId, patch) => applyAssignmentsPatch(entityId, patch),
  auditSnapshot: jobRowAuditSnapshot,
  deleteAuditSnapshot: jobDeleteAuditSnapshot,
  canDelete: canDeleteJob,
  listJoins: createJobListJoins(store),
});
