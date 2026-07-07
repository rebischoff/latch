// DO NOT EDIT — generated from item_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const ItemListFieldIds = {
  tree: "tree",
} as const;

export type ItemListFieldId = (typeof ItemListFieldIds)[keyof typeof ItemListFieldIds];

export const itemListColumnMap = {
  tree: [],
} as const satisfies Record<ItemListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const ItemListSchema = z.object({
  id: z.string(),
  tree: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const ItemListPatchSchema = z.object({
  tree: z.array(z.object({ user_id: z.string() })).optional(),
});

export type ItemListDto = z.infer<typeof ItemListSchema>;
export type ItemListPatchDto = z.infer<typeof ItemListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const itemListSurfacePolicyDef = defineSurfacePolicy({
  surface: "item_list",
  fieldIds: Object.values(ItemListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "create"],
});
