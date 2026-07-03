// DO NOT EDIT — generated from category_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const CategoryListFieldIds = {
  tree: "tree",
} as const;

export type CategoryListFieldId = (typeof CategoryListFieldIds)[keyof typeof CategoryListFieldIds];

export const categoryListColumnMap = {
  tree: [],
} as const satisfies Record<CategoryListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const CategoryListSchema = z.object({
  id: z.string(),
  tree: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const CategoryListPatchSchema = z.object({
  tree: z.array(z.object({ user_id: z.string() })).optional(),
});

export type CategoryListDto = z.infer<typeof CategoryListSchema>;
export type CategoryListPatchDto = z.infer<typeof CategoryListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const categoryListSurfacePolicyDef = defineSurfacePolicy({
  surface: "category_list",
  fieldIds: Object.values(CategoryListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "create"],
});
