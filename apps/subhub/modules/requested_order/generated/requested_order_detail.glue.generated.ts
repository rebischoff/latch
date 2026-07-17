// DO NOT EDIT — generated from requested_order_detail.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  RequestedOrderDetailPatchSchema,
} from "./requested_order_detail.schema.generated";

export type RequestedOrderDetailRow = {
  id: string;
  job_id: string;
  note: string;
  requested_at: string;
  requested_by: string | null;
};

const formatRequestedOrderDetailRow = (row: RequestedOrderDetailRow): Record<string, unknown> => ({
  id: row.id,
  job_id: row.job_id,
  note: row.note,
  requested_at: row.requested_at,
  requested_by: row.requested_by,
});

export const projectRequestedOrderDetailRow = (
  row: RequestedOrderDetailRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = { id: row.id, job_id: row.job_id, requested_by: row.requested_by, requested_at: row.requested_at, note: row.note };
  }
  return dto;
};

export const applyRequestedOrderDetailPatch = (
  row: RequestedOrderDetailRow,
  patch: Record<string, unknown>,
): RequestedOrderDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof RequestedOrderDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.job_id !== undefined) {
    next.job_id = typed.profile.job_id;
  }
  if (typed.profile?.requested_by !== undefined) {
    next.requested_by = typed.profile.requested_by;
  }
  if (typed.profile?.requested_at !== undefined) {
    next.requested_at = typed.profile.requested_at;
  }
  if (typed.profile?.note !== undefined) {
    next.note = typed.profile.note;
  }
  return next;
};

export const requestedOrderDetailDescriptor: SurfaceDescriptor<RequestedOrderDetailRow> = {
  surfaceId: "requested_order_detail",
  anchorTable: "requested_order",
  capabilities: ["detail"],
  patchSchema: RequestedOrderDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectRequestedOrderDetailRow,
  applyPatch: applyRequestedOrderDetailPatch,
  auditSnapshot: formatRequestedOrderDetailRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
