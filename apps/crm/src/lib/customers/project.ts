import { fieldAllows, type Manifest } from "@latch/contracts";

import type { MemoryCustomerRecord } from "../../../db/memory-store.js";
import type { CustomerRelatedData } from "../../../db/store.js";

/** Read DTO for `customer_detail` — keys omitted when manifest denies `read`. */
export type ProjectedCustomerDetail = {
  id: string;
  profile?: {
    name: string;
    phone: string | null;
  };
  billing?: {
    billing_notes: string | null;
  };
  sites?: { label: string }[];
  job_history?: { id: string; title: string; status: string }[];
};

/**
 * Build a Field-keyed DTO from a customer row and related store data.
 * Forbidden Fields are omitted entirely (not set to `null`).
 */
export const projectCustomerRow = (
  row: MemoryCustomerRecord,
  manifest: Manifest,
  related: CustomerRelatedData,
): ProjectedCustomerDetail => {
  const dto: ProjectedCustomerDetail = { id: row.id };

  if (fieldAllows(manifest, "profile", "read")) {
    dto.profile = {
      name: row.name,
      phone: row.phone ?? null,
    };
  }

  if (fieldAllows(manifest, "billing", "read")) {
    dto.billing = {
      billing_notes: row.billingNotes ?? null,
    };
  }

  if (fieldAllows(manifest, "sites", "read")) {
    dto.sites = related.sites.map((site) => ({ label: site.label }));
  }

  if (fieldAllows(manifest, "job_history", "read")) {
    dto.job_history = related.jobHistory.map((job) => ({
      id: job.id,
      title: job.title,
      status: job.status,
    }));
  }

  return dto;
};
