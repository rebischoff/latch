import type { AuditJson } from "@latch/audit";

import type {
  MemoryAssignmentRecord,
  MemoryJobStore,
} from "../../../db/memory-store.js";
import { jobRowAuditSnapshot } from "../jobs/apply-patch.js";

const parseScheduledAt = (value: unknown): Date | null => {
  if (value == null) {
    return null;
  }
  return new Date(String(value));
};

/** Replay a `jobs` delete audit `before` into the pilot memory store. */
export const replayJobFromDeleteBefore = (
  store: MemoryJobStore,
  recordId: string,
  before: AuditJson,
): AuditJson => {
  const customerId = before.customer_id;
  if (typeof customerId !== "string" || customerId.length === 0) {
    throw new Error("Job delete snapshot missing customer_id");
  }

  store.upsertJob({
    id: recordId,
    title: String(before.title ?? ""),
    status: String(before.status ?? ""),
    scheduledAt: parseScheduledAt(before.scheduled_at),
    description:
      before.description == null ? null : String(before.description),
    contractAmount:
      before.contract_amount == null
        ? null
        : String(before.contract_amount),
    customerId,
  });

  const rawAssignments = before.assignments;
  const assignments: MemoryAssignmentRecord[] = Array.isArray(rawAssignments)
    ? rawAssignments.map((row) => {
        const item = row as { job_id?: string; user_id?: string };
        return {
          jobId: String(item.job_id ?? recordId),
          userId: String(item.user_id ?? ""),
        };
      })
    : [];
  store.replaceAssignmentsForJob(recordId, assignments);

  const row = store.getJob(recordId);
  if (!row) {
    throw new Error(`Failed to restore job ${recordId}`);
  }
  return jobRowAuditSnapshot(row);
};

/** Replay a `customers` delete audit `before` (anchor + `sites`). */
export const replayCustomerFromDeleteBefore = (
  store: MemoryJobStore,
  recordId: string,
  before: AuditJson,
): AuditJson => {
  store.upsertCustomer({
    id: recordId,
    name: String(before.name ?? ""),
    phone: before.phone == null ? null : String(before.phone),
    billingNotes:
      before.billing_notes == null ? null : String(before.billing_notes),
  });

  const rawSites = before.sites;
  if (Array.isArray(rawSites)) {
    for (const row of rawSites) {
      const site = row as {
        id?: string;
        customer_id?: string;
        label?: string;
      };
      store.upsertSite({
        id: String(site.id ?? ""),
        customerId: String(site.customer_id ?? recordId),
        label: String(site.label ?? ""),
      });
    }
  }

  const customer = store.getCustomer(recordId);
  if (!customer) {
    throw new Error(`Failed to restore customer ${recordId}`);
  }
  return {
    name: customer.name,
    phone: customer.phone,
    billing_notes: customer.billingNotes,
  };
};

export const createCrmRestoreDeps = (store: MemoryJobStore) => ({
  supportedEntityTypes: ["jobs", "customers"],
  anchorExists: (tableName: string, recordId: string): boolean => {
    if (tableName === "jobs") {
      return store.getJob(recordId) !== undefined;
    }
    if (tableName === "customers") {
      return store.getCustomer(recordId) !== undefined;
    }
    return false;
  },
  replay: ({
    tableName,
    recordId,
    before,
  }: {
    tableName: string;
    recordId: string;
    before: AuditJson;
  }): AuditJson => {
    if (tableName === "jobs") {
      return replayJobFromDeleteBefore(store, recordId, before);
    }
    if (tableName === "customers") {
      return replayCustomerFromDeleteBefore(store, recordId, before);
    }
    throw new Error(`Unsupported entity_type for restore: ${tableName}`);
  },
});
