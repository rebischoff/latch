import type {
  MemoryCustomerRecord,
  MemorySiteRecord,
} from "../../../db/memory-store.js";
import type { CustomerRelatedData } from "../../../db/store.js";
import type { CustomerDetailPatchDto } from "./schemas.js";

/**
 * Apply a manifest-narrowed PATCH to an in-memory customer row.
 * Nested Field keys map to `customers` columns per `customer_detail.surface.yaml`.
 */
export const applyCustomerPatch = (
  row: MemoryCustomerRecord,
  patch: CustomerDetailPatchDto,
): MemoryCustomerRecord => {
  const next: MemoryCustomerRecord = { ...row };

  if (patch.profile) {
    if (patch.profile.name !== undefined) {
      next.name = patch.profile.name;
    }
    if (patch.profile.phone !== undefined) {
      next.phone = patch.profile.phone;
    }
  }

  if (patch.billing?.billing_notes !== undefined) {
    next.billingNotes = patch.billing.billing_notes;
  }

  return next;
};

/** Replace child `sites` rows for the customer (same replace semantics as job assignments). */
export const applySitesPatch = (
  customerId: string,
  patch: CustomerDetailPatchDto,
): CustomerRelatedData | undefined => {
  if (patch.sites === undefined) {
    return undefined;
  }

  const sites: MemorySiteRecord[] = patch.sites.map((site, index) => ({
    id: `${customerId}-site-${index}`,
    customerId,
    label: site.label,
  }));

  return { sites, jobHistory: [] };
};
