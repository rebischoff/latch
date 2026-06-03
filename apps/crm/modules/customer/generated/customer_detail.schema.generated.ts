// DO NOT EDIT — generated from customer_detail.surface.yaml

import { z } from "zod";

export const CustomerDetailFieldIds = {
  profile: "profile",
  billing: "billing",
  sites: "sites",
  job_history: "job_history",
} as const;

export type CustomerDetailFieldId = (typeof CustomerDetailFieldIds)[keyof typeof CustomerDetailFieldIds];

export const customerDetailColumnMap = {
  profile: ["customers.name", "customers.phone"],
  billing: ["customers.billing_notes"],
  sites: ["sites.label"],
  job_history: ["jobs.id", "jobs.title", "jobs.status"],
} as const satisfies Record<CustomerDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const CustomerDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    name: z.string(),
    phone: z.string().nullable(),
  }),
  billing: z.object({
    billing_notes: z.string().nullable(),
  }),
  sites: z.object({
    label: z.string(),
  }),
  job_history: z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const CustomerDetailPatchSchema = z.object({
  profile: z
    .object({
      name: z.string().optional(),
      phone: z.string().nullable().optional(),
    })
    .optional(),
  billing: z
    .object({
      billing_notes: z.string().nullable().optional(),
    })
    .optional(),
  sites: z
    .object({
      label: z.string().optional(),
    })
    .optional(),
  job_history: z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      status: z.string().optional(),
    })
    .optional(),
});

export type CustomerDetailDto = z.infer<typeof CustomerDetailSchema>;
export type CustomerDetailPatchDto = z.infer<typeof CustomerDetailPatchSchema>;
