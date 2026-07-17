import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import { RequestedOrderListPatchSchema } from "../../../modules/requested_order/generated/requested_order_list.schema.generated";

export const RequestedOrderListListQuerySchema = z.object({
  job_id: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

export type RequestedOrderListRow = {
  id: string;
  job_id: string;
  job_title: string;
  requested_at: string;
  note: string;
  open_line_count: number;
};

const formatRequestedOrderListRow = (
  row: RequestedOrderListRow,
): Record<string, unknown> => ({
  id: row.id,
  job_id: row.job_id,
  job_title: row.job_title,
  requested_at: row.requested_at,
  note: row.note,
  open_line_count: row.open_line_count,
});

/** `open_line_count` is DAL-computed (not a YAML column) — task 52 pin. */
export const projectRequestedOrderListRow = (
  row: RequestedOrderListRow,
  manifest: Manifest,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.summary?.includes("read")) {
    dto.summary = {
      id: row.id,
      job_id: row.job_id,
      title: row.job_title,
      requested_at: row.requested_at,
      note: row.note,
      open_line_count: row.open_line_count,
    };
  }

  return dto;
};

const applyRequestedOrderListPatch = (
  row: RequestedOrderListRow,
  patch: Record<string, unknown>,
): RequestedOrderListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof RequestedOrderListPatchSchema>;

  if (typed.summary?.job_id !== undefined) {
    next.job_id = typed.summary.job_id;
  }
  if (typed.summary?.title !== undefined) {
    next.job_title = typed.summary.title;
  }
  if (typed.summary?.requested_at !== undefined) {
    next.requested_at = typed.summary.requested_at;
  }
  if (typed.summary?.note !== undefined) {
    next.note = typed.summary.note;
  }

  return next;
};

export const requestedOrderListDescriptor: SurfaceDescriptor<RequestedOrderListRow> = {
  surfaceId: "requested_order_list",
  anchorTable: "requested_order",
  capabilities: ["list"],
  patchSchema: RequestedOrderListPatchSchema,
  listQuerySchema: RequestedOrderListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "summary",
  projectRow: projectRequestedOrderListRow,
  applyPatch: applyRequestedOrderListPatch,
  auditSnapshot: formatRequestedOrderListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
