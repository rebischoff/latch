// DO NOT EDIT — generated from job_detail.surface.yaml

import { z } from "zod";

export const JobDetailFieldIds = {
  summary: "summary",
  scope: "scope",
  financial_terms: "financial_terms",
  customer_ref: "customer_ref",
  assignments: "assignments",
} as const;

export type JobDetailFieldId = (typeof JobDetailFieldIds)[keyof typeof JobDetailFieldIds];

export const JobDetailVerificationFieldIds = ["financial_terms"] as const;
export type JobDetailVerificationFieldId = (typeof JobDetailVerificationFieldIds)[number];

export const jobDetailColumnMap = {
  summary: ["jobs.title", "jobs.status", "jobs.scheduled_at"],
  scope: ["jobs.description"],
  financial_terms: ["jobs.contract_amount"],
  customer_ref: ["customers.id", "customers.name"],
  assignments: [],
} as const satisfies Record<JobDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const JobDetailSchema = z.object({
  id: z.string(),
  summary: z.object({
    title: z.string(),
    status: z.string(),
    scheduled_at: z.string().nullable(),
  }),
  scope: z.object({
    description: z.string().nullable(),
  }),
  financial_terms: z.object({
    contract_amount: z.string().nullable(),
  }),
  customer_ref: z.object({
    id: z.string(),
    name: z.string(),
  }),
  assignments: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const JobDetailPatchSchema = z.object({
  summary: z
    .object({
      title: z.string().optional(),
      status: z.string().optional(),
      scheduled_at: z.string().nullable().optional(),
    })
    .optional(),
  scope: z
    .object({
      description: z.string().nullable().optional(),
    })
    .optional(),
  financial_terms: z
    .object({
      contract_amount: z.string().nullable().optional(),
    })
    .optional(),
  customer_ref: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  assignments: z.array(z.object({ user_id: z.string() })).optional(),
});

export type JobDetailDto = z.infer<typeof JobDetailSchema>;
export type JobDetailPatchDto = z.infer<typeof JobDetailPatchSchema>;
