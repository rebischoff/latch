// DO NOT EDIT — generated from purchase_order_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const PurchaseOrderListFieldIds = {
  summary: "summary",
} as const;

export type PurchaseOrderListFieldId = (typeof PurchaseOrderListFieldIds)[keyof typeof PurchaseOrderListFieldIds];

export const purchaseOrderListColumnMap = {
  summary: ["purchase_order.id", "purchase_order.po_number", "purchase_order.status", "purchase_order.job_id", "job.title", "purchase_order.vendor_party_id", "party.display_name", "purchase_order.order_date", "purchase_order.created_at"],
} as const satisfies Record<PurchaseOrderListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const PurchaseOrderListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    po_number: z.string().nullable(),
    status: z.string(),
    job_id: z.string(),
    title: z.string(),
    vendor_party_id: z.string(),
    display_name: z.string(),
    order_date: z.string().nullable(),
    created_at: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const PurchaseOrderListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      po_number: z.string().nullable().optional(),
      status: z.string().optional(),
      job_id: z.string().optional(),
      title: z.string().optional(),
      vendor_party_id: z.string().optional(),
      display_name: z.string().optional(),
      order_date: z.string().nullable().optional(),
      created_at: z.string().optional(),
    })
    .optional(),
});

export type PurchaseOrderListDto = z.infer<typeof PurchaseOrderListSchema>;
export type PurchaseOrderListPatchDto = z.infer<typeof PurchaseOrderListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const purchaseOrderListSurfacePolicyDef = defineSurfacePolicy({
  surface: "purchase_order_list",
  fieldIds: Object.values(PurchaseOrderListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
});
