// DO NOT EDIT — generated from job_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const JobListFieldIds = {
  summary: "summary",
} as const;

export type JobListFieldId = (typeof JobListFieldIds)[keyof typeof JobListFieldIds];

export const jobListColumnMap = {
  summary: ["job.id", "job.title", "site.name"],
} as const satisfies Record<JobListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const JobListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    title: z.string(),
    name: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const JobListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
});

export type JobListDto = z.infer<typeof JobListSchema>;
export type JobListPatchDto = z.infer<typeof JobListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const jobListSurfacePolicyDef = defineSurfacePolicy({
  surface: "job_list",
  fieldIds: Object.values(JobListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
});
