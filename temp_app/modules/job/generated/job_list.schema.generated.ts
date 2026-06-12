// DO NOT EDIT — generated from job_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const JobListFieldIds = {
  summary: "summary",
  customer_site: "customer_site",
  financial_terms: "financial_terms",
  assignments: "assignments",
} as const;

export type JobListFieldId = (typeof JobListFieldIds)[keyof typeof JobListFieldIds];

export const jobListColumnMap = {
  summary: ["jobs.id", "jobs.title", "jobs.status", "jobs.scheduled_at"],
  customer_site: ["customers.name", "sites.label"],
  financial_terms: ["jobs.contract_amount"],
  assignments: [],
} as const satisfies Record<JobListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const JobListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
    scheduled_at: z.string().nullable(),
  }),
  customer_site: z.object({
    name: z.string(),
    label: z.string(),
  }),
  financial_terms: z.object({
    contract_amount: z.string(),
  }),
  assignments: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const JobListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      status: z.string().optional(),
      scheduled_at: z.string().nullable().optional(),
    })
    .optional(),
  customer_site: z
    .object({
      name: z.string().optional(),
      label: z.string().optional(),
    })
    .optional(),
  financial_terms: z
    .object({
      contract_amount: z.string().optional(),
    })
    .optional(),
  assignments: z.array(z.object({ user_id: z.string() })).optional(),
});

export type JobListDto = z.infer<typeof JobListSchema>;
export type JobListPatchDto = z.infer<typeof JobListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const jobListSurfacePolicyDef = defineSurfacePolicy({
  surface: "job_list",
  fieldIds: Object.values(JobListFieldIds),
  fieldActions: ["read", "write", "submit", "approve"],
  surfaceActions: ["read", "write", "delete"],
  kind: "business",
});
