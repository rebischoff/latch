// DO NOT EDIT — generated from job_detail.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  JobDetailPatchSchema,
} from "./job_detail.schema.generated";

export type JobDetailRow = {
  estimate_id: string | null;
  id: string;
  job_kind: string;
  site_id: string;
  status: string;
  title: string;
};

const formatJobDetailRow = (row: JobDetailRow): Record<string, unknown> => ({
  estimate_id: row.estimate_id,
  id: row.id,
  job_kind: row.job_kind,
  site_id: row.site_id,
  status: row.status,
  title: row.title,
});

export const projectJobDetailRow = (
  row: JobDetailRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = { id: row.id, title: row.title, site_id: row.site_id, job_kind: row.job_kind, status: row.status, estimate_id: row.estimate_id };
  }
  return dto;
};

export const applyJobDetailPatch = (
  row: JobDetailRow,
  patch: Record<string, unknown>,
): JobDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof JobDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.title !== undefined) {
    next.title = typed.profile.title;
  }
  if (typed.profile?.site_id !== undefined) {
    next.site_id = typed.profile.site_id;
  }
  if (typed.profile?.job_kind !== undefined) {
    next.job_kind = typed.profile.job_kind;
  }
  if (typed.profile?.status !== undefined) {
    next.status = typed.profile.status;
  }
  if (typed.profile?.estimate_id !== undefined) {
    next.estimate_id = typed.profile.estimate_id;
  }
  return next;
};

export const jobDetailDescriptor: SurfaceDescriptor<JobDetailRow> = {
  surfaceId: "job_detail",
  anchorTable: "job",
  capabilities: ["detail"],
  patchSchema: JobDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectJobDetailRow,
  applyPatch: applyJobDetailPatch,
  auditSnapshot: formatJobDetailRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
