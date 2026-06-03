import type { SurfaceDescriptor } from "@latch/dal";

import type { MemoryCustomerRecord } from "../../../db/memory-store.js";
import type { CustomerRelatedData } from "../../../db/store.js";
import { applyCustomerPatch, applySitesPatch } from "./apply-patch.js";
import { projectCustomerRow } from "./project.js";
import {
  CustomerDetailPatchSchema,
  type CustomerDetailPatchDto,
} from "./schemas.js";

export const customerRowAuditSnapshot = (
  row: MemoryCustomerRecord,
): Record<string, unknown> => ({
  name: row.name,
  phone: row.phone,
  billing_notes: row.billingNotes,
});

/** Full delete `before` for future customer delete + restore (anchor + CASCADE `sites`). */
export const customerDeleteAuditSnapshot = (
  row: MemoryCustomerRecord,
  related: CustomerRelatedData,
): Record<string, unknown> => ({
  ...customerRowAuditSnapshot(row),
  sites: related.sites.map((site) => ({
    id: site.id,
    customer_id: site.customerId,
    label: site.label,
  })),
});

export const customerDetailDescriptor: SurfaceDescriptor<
  MemoryCustomerRecord,
  CustomerRelatedData
> = {
  surfaceId: "customer_detail",
  anchorTable: "customers",
  capabilities: ["detail"],
  patchSchema: CustomerDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: (row, manifest, related) =>
    projectCustomerRow(row, manifest, related),
  applyPatch: (row, patch) =>
    applyCustomerPatch(row, patch as CustomerDetailPatchDto),
  applyRelatedPatch: (entityId, patch) =>
    applySitesPatch(entityId, patch as CustomerDetailPatchDto),
  auditSnapshot: customerRowAuditSnapshot,
  deleteAuditSnapshot: customerDeleteAuditSnapshot,
};
