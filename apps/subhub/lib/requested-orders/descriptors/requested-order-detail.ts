import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

/**
 * Hand-written — codegen stubs `line_items` as a placeholder `{ user_id }`
 * collection (child-collections.md convention; see estimate_detail /
 * job_detail descriptors for the same override pattern).
 */
export const RequestedOrderLineItemPatchElementSchema = z
  .object({
    id: z.string().optional(),
    job_line_part_id: z.string().nullable().optional(),
    part_id: z.string().nullable().optional(),
    description: z.string().optional(),
    quantity: z.number().positive(),
    unit: z.string().optional(),
    status: z
      .enum(["open", "on_purchase_order", "fulfilled", "withdrawn"])
      .optional(),
    withdrawal_note: z.string().optional(),
  })
  .strict();

/** `job_id` is intentionally absent — immutable after create (task 52 pin). */
export const RequestedOrderDetailPatchSchema = z
  .object({
    profile: z
      .object({
        note: z.string().optional(),
      })
      .strict()
      .optional(),
    line_items: z.array(RequestedOrderLineItemPatchElementSchema).optional(),
  })
  .strict();

/** POST body — `profile.job_id` required and locked for the life of the header. */
export const RequestedOrderDetailCreateSchema = z
  .object({
    profile: z
      .object({
        job_id: z.string().min(1),
        note: z.string().optional(),
      })
      .strict(),
    line_items: z.array(RequestedOrderLineItemPatchElementSchema).optional(),
  })
  .strict();

export type RequestedOrderDetailRow = {
  id: string;
  job_id: string;
  job_title: string;
  requested_by: string | null;
  requested_by_display_name: string | null;
  requested_at: string;
  note: string;
};

export type RequestedOrderLineItemRow = {
  id: string;
  line_number: number;
  sort_order: number;
  job_line_part_id: string | null;
  part_id: string | null;
  part_mpn: string | null;
  part_description: string | null;
  description: string;
  quantity: number;
  unit: string;
  status: string;
  withdrawal_note: string;
  purchase_order_id: string | null;
  purchase_order_number: string | null;
  purchase_order_status: string | null;
};

export type RequestedOrderDetailRelated = {
  line_items: RequestedOrderLineItemRow[];
};

export type RequestedOrderLineItemPatchRow = z.infer<
  typeof RequestedOrderLineItemPatchElementSchema
>;

export type RequestedOrderDetailRelatedPatch = {
  line_items?: RequestedOrderLineItemPatchRow[];
};

export type RequestedOrderDetailStoreRelated =
  | RequestedOrderDetailRelated
  | RequestedOrderDetailRelatedPatch;

export type RequestedOrderDetailWriteRow = Pick<
  RequestedOrderDetailRow,
  "id" | "job_id" | "note"
>;

const formatRequestedOrderDetailRow = (
  row: RequestedOrderDetailRow,
): Record<string, unknown> => ({
  id: row.id,
  job_id: row.job_id,
  requested_by: row.requested_by,
  requested_at: row.requested_at,
  note: row.note,
});

const normalizeRequestedOrderDetailRelated = (
  related: RequestedOrderDetailStoreRelated,
): RequestedOrderDetailRelated => ({
  line_items: (related.line_items ?? []) as RequestedOrderLineItemRow[],
});

export const projectRequestedOrderDetailRow = (
  row: RequestedOrderDetailRow,
  manifest: Manifest,
  related: RequestedOrderDetailStoreRelated,
): Record<string, unknown> => {
  const normalized = normalizeRequestedOrderDetailRelated(related);
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = {
      id: row.id,
      job_id: row.job_id,
      job_title: row.job_title,
      requested_by: row.requested_by,
      requested_by_display_name: row.requested_by_display_name,
      requested_at: row.requested_at,
      note: row.note,
    };
  }

  if (manifest.fields.line_items?.includes("read")) {
    dto.line_items = normalized.line_items;
  }

  return dto;
};

const applyRequestedOrderDetailPatch = (
  row: RequestedOrderDetailRow,
  patch: Record<string, unknown>,
): RequestedOrderDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof RequestedOrderDetailPatchSchema>;

  if (typed.profile?.note !== undefined) {
    next.note = typed.profile.note;
  }

  return next;
};

export const requestedOrderDetailDescriptor: SurfaceDescriptor<
  RequestedOrderDetailRow,
  RequestedOrderDetailStoreRelated
> = {
  surfaceId: "requested_order_detail",
  anchorTable: "requested_order",
  capabilities: ["detail"],
  patchSchema: RequestedOrderDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectRequestedOrderDetailRow,
  applyPatch: applyRequestedOrderDetailPatch,
  applyRelatedPatch: (_entityId, patch) => {
    const typed = patch as z.infer<typeof RequestedOrderDetailPatchSchema>;
    const related: RequestedOrderDetailRelatedPatch = {};

    if (typed.line_items !== undefined) {
      related.line_items = typed.line_items;
    }

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatRequestedOrderDetailRow,
  deleteAuditSnapshot: (row, related) => ({
    ...formatRequestedOrderDetailRow(row),
    line_items: normalizeRequestedOrderDetailRelated(related).line_items,
  }),
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
