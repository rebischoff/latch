// DO NOT EDIT — generated from job_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const JobDetailFieldIds = {
  profile: "profile",
  stakeholders: "stakeholders",
  conditions: "conditions",
  line_items: "line_items",
  field_progress: "field_progress",
  field_zone_orders: "field_zone_orders",
} as const;

export type JobDetailFieldId = (typeof JobDetailFieldIds)[keyof typeof JobDetailFieldIds];

export const jobDetailColumnMap = {
  profile: ["job.id", "job.title", "job.site_id", "job.job_kind", "job.status", "job.estimate_id"],
  stakeholders: [],
  conditions: [],
  line_items: [],
  field_progress: [],
  field_zone_orders: [],
} as const satisfies Record<JobDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const JobDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    title: z.string(),
    site_id: z.string(),
    job_kind: z.string(),
    status: z.string(),
    estimate_id: z.string().nullable(),
  }),
  stakeholders: z.array(z.object({ user_id: z.string() })),
  conditions: z.array(z.object({ user_id: z.string() })),
  line_items: z.array(z.object({ user_id: z.string() })),
  field_progress: z.array(z.object({ user_id: z.string() })),
  field_zone_orders: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const JobDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      site_id: z.string().optional(),
      job_kind: z.string().optional(),
      status: z.string().optional(),
      estimate_id: z.string().nullable().optional(),
    })
    .optional(),
  stakeholders: z.array(z.object({ user_id: z.string() })).optional(),
  conditions: z.array(z.object({ user_id: z.string() })).optional(),
  line_items: z.array(z.object({ user_id: z.string() })).optional(),
  field_progress: z.array(z.object({ user_id: z.string() })).optional(),
  field_zone_orders: z.array(z.object({ user_id: z.string() })).optional(),
});

export type JobDetailDto = z.infer<typeof JobDetailSchema>;
export type JobDetailPatchDto = z.infer<typeof JobDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const jobDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "job_detail",
  fieldIds: Object.values(JobDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "complete"],
});
