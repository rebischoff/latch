import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import type {
  PurchaseOrderDetailRow,
  PurchaseOrderLineDto,
} from "../repository";

const ShipmentSchema = z
  .object({
    id: z.string().optional(),
    shipment_number: z.number().optional(),
    quantity: z.number(),
    eta_date: z.string().nullable().optional(),
    status: z
      .enum(["scheduled", "shipped", "delivered", "received", "cancelled"])
      .optional(),
  })
  .strict();

const SourceSchema = z
  .object({
    id: z.string().optional(),
    job_material_request_id: z.string(),
    quantity: z.number(),
    site_zone_id: z.string().nullable().optional(),
    site_zone_name: z.string().nullable().optional(),
    request_status: z.string().optional(),
  })
  .strict();

const LineItemSchema = z
  .object({
    id: z.string().optional(),
    line_number: z.number().optional(),
    description: z.string(),
    quantity: z.number(),
    unit: z.string().optional(),
    unit_price: z.number().optional(),
    part_id: z.string().nullable().optional(),
    part_mpn: z.string().nullable().optional(),
    vendor_part_id: z.string().nullable().optional(),
    job_line_part_id: z.string().nullable().optional(),
    status: z.string().optional(),
    ordered_at: z.string().nullable().optional(),
    shipments: z.array(ShipmentSchema).optional(),
    sources: z.array(SourceSchema).optional(),
  })
  .strict();

/** Hand-written — codegen stubs empty `line_items` Field. */
export const PurchaseOrderDetailPatchSchema = z
  .object({
    profile: z
      .object({
        delivery_method: z.string().nullable().optional(),
        ship_to_note: z.string().optional(),
      })
      .strict()
      .optional(),
    line_items: z.array(LineItemSchema).optional(),
  })
  .strict();

export type PurchaseOrderDetailRelated = {
  line_items?: PurchaseOrderLineDto[];
};

const formatPurchaseOrderDetailRow = (
  row: PurchaseOrderDetailRow,
): Record<string, unknown> => ({
  id: row.id,
  po_number: row.po_number,
  status: row.status,
  job_id: row.job_id,
  job_title: row.job_title,
  vendor_party_id: row.vendor_party_id,
  vendor_display_name: row.vendor_display_name,
  delivery_method: row.delivery_method,
  ship_to_note: row.ship_to_note,
  order_date: row.order_date,
  created_at: row.created_at,
  updated_at: row.updated_at,
  line_items: row.line_items,
});

export const projectPurchaseOrderDetailRow = (
  row: PurchaseOrderDetailRow,
  manifest: Manifest,
  related?: PurchaseOrderDetailRelated | unknown,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };
  const relatedTyped = related as PurchaseOrderDetailRelated | undefined;
  const lineItems = relatedTyped?.line_items ?? row.line_items;

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = {
      id: row.id,
      po_number: row.po_number,
      status: row.status,
      job_id: row.job_id,
      title: row.job_title,
      vendor_party_id: row.vendor_party_id,
      display_name: row.vendor_display_name,
      delivery_method: row.delivery_method,
      ship_to_note: row.ship_to_note,
      order_date: row.order_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  if (manifest.fields.line_items?.includes("read")) {
    dto.line_items = lineItems;
  }

  return dto;
};

const applyPurchaseOrderDetailPatch = (
  row: PurchaseOrderDetailRow,
  patch: Record<string, unknown>,
): PurchaseOrderDetailRow => {
  const next = { ...row, line_items: [...row.line_items] };
  const typed = patch as z.infer<typeof PurchaseOrderDetailPatchSchema>;

  if (typed.profile?.delivery_method !== undefined) {
    next.delivery_method = typed.profile.delivery_method;
  }
  if (typed.profile?.ship_to_note !== undefined) {
    next.ship_to_note = typed.profile.ship_to_note;
  }

  return next;
};

export const purchaseOrderDetailDescriptor: SurfaceDescriptor<
  PurchaseOrderDetailRow,
  PurchaseOrderDetailRelated
> = {
  surfaceId: "purchase_order_detail",
  anchorTable: "purchase_order",
  capabilities: ["detail"],
  patchSchema: PurchaseOrderDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectPurchaseOrderDetailRow,
  applyPatch: applyPurchaseOrderDetailPatch,
  applyRelatedPatch: (_entityId, patch) => {
    const typed = patch as z.infer<typeof PurchaseOrderDetailPatchSchema>;
    if (typed.line_items === undefined) {
      return undefined;
    }
    return { line_items: typed.line_items as PurchaseOrderLineDto[] };
  },
  auditSnapshot: formatPurchaseOrderDetailRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
