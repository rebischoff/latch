import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import { PurchaseOrderListPatchSchema } from "../../../modules/purchase_order/generated/purchase_order_list.schema.generated";
import type { PurchaseOrderListRow } from "../repository";

export const PurchaseOrderListListQuerySchema = z.object({
  job_id: z.string().optional(),
  status: z.enum(["draft", "sent", "received", "cancelled"]).optional(),
  vendor_party_id: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

const formatPurchaseOrderListRow = (
  row: PurchaseOrderListRow,
): Record<string, unknown> => ({
  id: row.id,
  po_number: row.po_number,
  status: row.status,
  job_id: row.job_id,
  job_title: row.job_title,
  vendor_party_id: row.vendor_party_id,
  vendor_display_name: row.vendor_display_name,
  order_date: row.order_date,
  created_at: row.created_at,
});

export const projectPurchaseOrderListRow = (
  row: PurchaseOrderListRow,
  manifest: Manifest,
  _related?: unknown,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.summary?.includes("read")) {
    dto.summary = {
      id: row.id,
      po_number: row.po_number,
      status: row.status,
      job_id: row.job_id,
      title: row.job_title,
      vendor_party_id: row.vendor_party_id,
      display_name: row.vendor_display_name,
      order_date: row.order_date,
      created_at: row.created_at,
    };
  }

  return dto;
};

const applyPurchaseOrderListPatch = (
  row: PurchaseOrderListRow,
  patch: Record<string, unknown>,
): PurchaseOrderListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof PurchaseOrderListPatchSchema>;

  if (typed.summary?.po_number !== undefined) {
    next.po_number = typed.summary.po_number;
  }
  if (typed.summary?.status !== undefined) {
    next.status = typed.summary.status;
  }
  if (typed.summary?.title !== undefined) {
    next.job_title = typed.summary.title;
  }
  if (typed.summary?.display_name !== undefined) {
    next.vendor_display_name = typed.summary.display_name;
  }
  if (typed.summary?.order_date !== undefined) {
    next.order_date = typed.summary.order_date;
  }

  return next;
};

export const purchaseOrderListDescriptor: SurfaceDescriptor<PurchaseOrderListRow> =
  {
    surfaceId: "purchase_order_list",
    anchorTable: "purchase_order",
    capabilities: ["list"],
    patchSchema: PurchaseOrderListPatchSchema,
    listQuerySchema: PurchaseOrderListListQuerySchema,
    listDefaultPageSize: 50,
    deleteAuditFieldId: "summary",
    projectRow: projectPurchaseOrderListRow,
    applyPatch: applyPurchaseOrderListPatch,
    auditSnapshot: formatPurchaseOrderListRow,
    canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
  };
