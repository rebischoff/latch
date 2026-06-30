// DO NOT EDIT — generated from estimate_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const EstimateDetailFieldIds = {
  profile: "profile",
  stakeholders: "stakeholders",
  systems: "systems",
  line_items: "line_items",
} as const;

export type EstimateDetailFieldId = (typeof EstimateDetailFieldIds)[keyof typeof EstimateDetailFieldIds];

export const estimateDetailColumnMap = {
  profile: ["estimate.id", "estimate.title", "estimate.site_id", "estimate.status", "estimate.estimate_date", "estimate.valid_until", "estimate.source_estimate_id", "estimate.category_id"],
  stakeholders: [],
  systems: [],
  line_items: [],
} as const satisfies Record<EstimateDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const EstimateDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    title: z.string(),
    site_id: z.string(),
    status: z.string(),
    estimate_date: z.string().nullable(),
    valid_until: z.string().nullable(),
    source_estimate_id: z.string().nullable(),
    category_id: z.string().nullable(),
  }),
  stakeholders: z.array(z.object({ user_id: z.string() })),
  systems: z.array(z.object({ user_id: z.string() })),
  line_items: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const EstimateDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      site_id: z.string().optional(),
      status: z.string().optional(),
      estimate_date: z.string().nullable().optional(),
      valid_until: z.string().nullable().optional(),
      source_estimate_id: z.string().nullable().optional(),
      category_id: z.string().nullable().optional(),
    })
    .optional(),
  stakeholders: z.array(z.object({ user_id: z.string() })).optional(),
  systems: z.array(z.object({ user_id: z.string() })).optional(),
  line_items: z.array(z.object({ user_id: z.string() })).optional(),
});

export type EstimateDetailDto = z.infer<typeof EstimateDetailSchema>;
export type EstimateDetailPatchDto = z.infer<typeof EstimateDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const estimateDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "estimate_detail",
  fieldIds: Object.values(EstimateDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete", "win", "lose"],
});
