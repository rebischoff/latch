// DO NOT EDIT — generated from purchase_order_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const PurchaseOrderDetailFieldIds = {
  profile: "profile",
  line_items: "line_items",
} as const;

export type PurchaseOrderDetailFieldId = (typeof PurchaseOrderDetailFieldIds)[keyof typeof PurchaseOrderDetailFieldIds];

export const purchaseOrderDetailColumnMap = {
  profile: ["purchase_order.id", "purchase_order.po_number", "purchase_order.status", "purchase_order.job_id", "job.title", "purchase_order.vendor_party_id", "party.display_name", "purchase_order.delivery_method", "purchase_order.ship_to_note", "purchase_order.order_date", "purchase_order.created_at", "purchase_order.updated_at"],
  line_items: [],
} as const satisfies Record<PurchaseOrderDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const PurchaseOrderDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    po_number: z.string().nullable(),
    status: z.string(),
    job_id: z.string(),
    title: z.string(),
    vendor_party_id: z.string(),
    display_name: z.string(),
    delivery_method: z.string().nullable(),
    ship_to_note: z.string(),
    order_date: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
  line_items: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const PurchaseOrderDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      po_number: z.string().nullable().optional(),
      status: z.string().optional(),
      job_id: z.string().optional(),
      title: z.string().optional(),
      vendor_party_id: z.string().optional(),
      display_name: z.string().optional(),
      delivery_method: z.string().nullable().optional(),
      ship_to_note: z.string().optional(),
      order_date: z.string().nullable().optional(),
      created_at: z.string().optional(),
      updated_at: z.string().optional(),
    })
    .optional(),
  line_items: z.array(z.object({ user_id: z.string() })).optional(),
});

export type PurchaseOrderDetailDto = z.infer<typeof PurchaseOrderDetailSchema>;
export type PurchaseOrderDetailPatchDto = z.infer<typeof PurchaseOrderDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const purchaseOrderDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "purchase_order_detail",
  fieldIds: Object.values(PurchaseOrderDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "send", "cancel", "delete"],
});
