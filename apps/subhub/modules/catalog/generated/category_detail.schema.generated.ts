// DO NOT EDIT — generated from category_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const CategoryDetailFieldIds = {
  profile: "profile",
  spec_definitions: "spec_definitions",
  spec_participation: "spec_participation",
} as const;

export type CategoryDetailFieldId = (typeof CategoryDetailFieldIds)[keyof typeof CategoryDetailFieldIds];

export const categoryDetailColumnMap = {
  profile: ["category.id", "category.name", "category.parent_id", "category.sort_order", "category.csi_code", "category.default_phase_template_id"],
  spec_definitions: [],
  spec_participation: [],
} as const satisfies Record<CategoryDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const CategoryDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    name: z.string(),
    parent_id: z.string().nullable(),
    sort_order: z.number(),
    csi_code: z.string().nullable(),
    default_phase_template_id: z.string().nullable(),
  }),
  spec_definitions: z.array(z.object({ user_id: z.string() })),
  spec_participation: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const CategoryDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      parent_id: z.string().nullable().optional(),
      sort_order: z.number().optional(),
      csi_code: z.string().nullable().optional(),
      default_phase_template_id: z.string().nullable().optional(),
    })
    .optional(),
  spec_definitions: z.array(z.object({ user_id: z.string() })).optional(),
  spec_participation: z.array(z.object({ user_id: z.string() })).optional(),
});

export type CategoryDetailDto = z.infer<typeof CategoryDetailSchema>;
export type CategoryDetailPatchDto = z.infer<typeof CategoryDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const categoryDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "category_detail",
  fieldIds: Object.values(CategoryDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
