import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import { JobMaterialRequestListPatchSchema } from "../../../modules/job_material_request/generated/job_material_request_list.schema.generated";

export const JobMaterialRequestListListQuerySchema = z.object({
  job_id: z.string().optional(),
  status: z.enum(["open", "on_purchase_order", "fulfilled"]).optional(),
  site_zone_id: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

export type JobMaterialRequestListRow = {
  id: string;
  job_id: string;
  job_title: string;
  site_zone_id: string | null;
  site_zone_name: string | null;
  job_line_part_id: string | null;
  part_id: string | null;
  part_mpn: string | null;
  description: string;
  quantity: number;
  unit: string;
  status: string;
  requested_at: string;
  requested_by_display_name: string | null;
};

const formatJobMaterialRequestListRow = (
  row: JobMaterialRequestListRow,
): Record<string, unknown> => ({
  id: row.id,
  job_id: row.job_id,
  job_title: row.job_title,
  site_zone_id: row.site_zone_id,
  site_zone_name: row.site_zone_name,
  job_line_part_id: row.job_line_part_id,
  part_id: row.part_id,
  part_mpn: row.part_mpn,
  description: row.description,
  quantity: row.quantity,
  unit: row.unit,
  status: row.status,
  requested_at: row.requested_at,
  requested_by_display_name: row.requested_by_display_name,
});

export const projectJobMaterialRequestListRow = (
  row: JobMaterialRequestListRow,
  manifest: Manifest,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.summary?.includes("read")) {
    dto.summary = {
      id: row.id,
      job_id: row.job_id,
      title: row.job_title,
      site_zone_id: row.site_zone_id,
      name: row.site_zone_name,
      job_line_part_id: row.job_line_part_id,
      part_id: row.part_id,
      mpn: row.part_mpn,
      description: row.description,
      quantity: row.quantity,
      unit: row.unit,
      status: row.status,
      requested_at: row.requested_at,
    };
  }

  return dto;
};

const applyJobMaterialRequestListPatch = (
  row: JobMaterialRequestListRow,
  patch: Record<string, unknown>,
): JobMaterialRequestListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof JobMaterialRequestListPatchSchema>;

  if (typed.summary?.job_id !== undefined) {
    next.job_id = typed.summary.job_id;
  }
  if (typed.summary?.title !== undefined) {
    next.job_title = typed.summary.title;
  }
  if (typed.summary?.site_zone_id !== undefined) {
    next.site_zone_id = typed.summary.site_zone_id;
  }
  if (typed.summary?.name !== undefined) {
    next.site_zone_name = typed.summary.name;
  }
  if (typed.summary?.job_line_part_id !== undefined) {
    next.job_line_part_id = typed.summary.job_line_part_id;
  }
  if (typed.summary?.part_id !== undefined) {
    next.part_id = typed.summary.part_id;
  }
  if (typed.summary?.mpn !== undefined) {
    next.part_mpn = typed.summary.mpn;
  }
  if (typed.summary?.description !== undefined) {
    next.description = typed.summary.description;
  }
  if (typed.summary?.quantity !== undefined) {
    next.quantity = typed.summary.quantity;
  }
  if (typed.summary?.unit !== undefined) {
    next.unit = typed.summary.unit;
  }
  if (typed.summary?.status !== undefined) {
    next.status = typed.summary.status;
  }
  if (typed.summary?.requested_at !== undefined) {
    next.requested_at = typed.summary.requested_at;
  }

  return next;
};

export const jobMaterialRequestListDescriptor: SurfaceDescriptor<JobMaterialRequestListRow> =
  {
    surfaceId: "job_material_request_list",
    anchorTable: "job_material_request",
    capabilities: ["list"],
    patchSchema: JobMaterialRequestListPatchSchema,
    listQuerySchema: JobMaterialRequestListListQuerySchema,
    listDefaultPageSize: 50,
    deleteAuditFieldId: "summary",
    projectRow: projectJobMaterialRequestListRow,
    applyPatch: applyJobMaterialRequestListPatch,
    auditSnapshot: formatJobMaterialRequestListRow,
    canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
  };
