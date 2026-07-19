// DO NOT EDIT — generated from job_material_request_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const JobMaterialRequestListFieldIds = {
  summary: "summary",
} as const;

export type JobMaterialRequestListFieldId = (typeof JobMaterialRequestListFieldIds)[keyof typeof JobMaterialRequestListFieldIds];

export const jobMaterialRequestListColumnMap = {
  summary: ["job_material_request.id", "job_material_request.job_id", "job.title", "job_material_request.site_zone_id", "site_zone.name", "job_material_request.job_line_part_id", "job_material_request.part_id", "manufacturer_part.mpn", "job_material_request.description", "job_material_request.quantity", "job_material_request.unit", "job_material_request.status", "job_material_request.requested_at"],
} as const satisfies Record<JobMaterialRequestListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const JobMaterialRequestListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    job_id: z.string(),
    title: z.string(),
    site_zone_id: z.string().nullable(),
    name: z.string().nullable(),
    job_line_part_id: z.string().nullable(),
    part_id: z.string().nullable(),
    mpn: z.string().nullable(),
    description: z.string(),
    quantity: z.number(),
    unit: z.string(),
    status: z.string(),
    requested_at: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const JobMaterialRequestListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      job_id: z.string().optional(),
      title: z.string().optional(),
      site_zone_id: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
      job_line_part_id: z.string().nullable().optional(),
      part_id: z.string().nullable().optional(),
      mpn: z.string().nullable().optional(),
      description: z.string().optional(),
      quantity: z.number().optional(),
      unit: z.string().optional(),
      status: z.string().optional(),
      requested_at: z.string().optional(),
    })
    .optional(),
});

export type JobMaterialRequestListDto = z.infer<typeof JobMaterialRequestListSchema>;
export type JobMaterialRequestListPatchDto = z.infer<typeof JobMaterialRequestListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const jobMaterialRequestListSurfacePolicyDef = defineSurfacePolicy({
  surface: "job_material_request_list",
  fieldIds: Object.values(JobMaterialRequestListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
});
