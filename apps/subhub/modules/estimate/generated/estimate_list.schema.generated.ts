// DO NOT EDIT — generated from estimate_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const EstimateListFieldIds = {
  summary: "summary",
} as const;

export type EstimateListFieldId = (typeof EstimateListFieldIds)[keyof typeof EstimateListFieldIds];

export const estimateListColumnMap = {
  summary: ["estimate.id", "estimate.title", "estimate.status", "estimate.estimate_date", "site.name"],
} as const satisfies Record<EstimateListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const EstimateListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
    estimate_date: z.string().nullable(),
    name: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const EstimateListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      status: z.string().optional(),
      estimate_date: z.string().nullable().optional(),
      name: z.string().optional(),
    })
    .optional(),
});

export type EstimateListDto = z.infer<typeof EstimateListSchema>;
export type EstimateListPatchDto = z.infer<typeof EstimateListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const estimateListSurfacePolicyDef = defineSurfacePolicy({
  surface: "estimate_list",
  fieldIds: Object.values(EstimateListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
});
