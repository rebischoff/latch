// DO NOT EDIT — generated from estimate_detail.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  EstimateDetailPatchSchema,
} from "./estimate_detail.schema.generated";

export type EstimateDetailRow = {
  category_id: string | null;
  estimate_date: string | null;
  id: string;
  site_id: string;
  source_estimate_id: string | null;
  status: string;
  title: string;
  valid_until: string | null;
};

const formatEstimateDetailRow = (row: EstimateDetailRow): Record<string, unknown> => ({
  category_id: row.category_id,
  estimate_date: row.estimate_date,
  id: row.id,
  site_id: row.site_id,
  source_estimate_id: row.source_estimate_id,
  status: row.status,
  title: row.title,
  valid_until: row.valid_until,
});

export const projectEstimateDetailRow = (
  row: EstimateDetailRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = { id: row.id, title: row.title, site_id: row.site_id, status: row.status, estimate_date: row.estimate_date, valid_until: row.valid_until, source_estimate_id: row.source_estimate_id, category_id: row.category_id };
  }
  return dto;
};

export const applyEstimateDetailPatch = (
  row: EstimateDetailRow,
  patch: Record<string, unknown>,
): EstimateDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof EstimateDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.title !== undefined) {
    next.title = typed.profile.title;
  }
  if (typed.profile?.site_id !== undefined) {
    next.site_id = typed.profile.site_id;
  }
  if (typed.profile?.status !== undefined) {
    next.status = typed.profile.status;
  }
  if (typed.profile?.estimate_date !== undefined) {
    next.estimate_date = typed.profile.estimate_date;
  }
  if (typed.profile?.valid_until !== undefined) {
    next.valid_until = typed.profile.valid_until;
  }
  if (typed.profile?.source_estimate_id !== undefined) {
    next.source_estimate_id = typed.profile.source_estimate_id;
  }
  if (typed.profile?.category_id !== undefined) {
    next.category_id = typed.profile.category_id;
  }
  return next;
};

export const estimateDetailDescriptor: SurfaceDescriptor<EstimateDetailRow> = {
  surfaceId: "estimate_detail",
  anchorTable: "estimate",
  capabilities: ["detail"],
  patchSchema: EstimateDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectEstimateDetailRow,
  applyPatch: applyEstimateDetailPatch,
  auditSnapshot: formatEstimateDetailRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
