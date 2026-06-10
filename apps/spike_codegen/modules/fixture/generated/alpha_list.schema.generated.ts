// DO NOT EDIT — generated from alpha_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const AlphaListFieldIds = {
  title: "title",
  status: "status",
  owner: "owner",
  category: "category",
} as const;

export type AlphaListFieldId = (typeof AlphaListFieldIds)[keyof typeof AlphaListFieldIds];

export const alphaListColumnMap = {
  title: ["fixture_alpha.title"],
  status: ["fixture_alpha.status"],
  owner: ["fixture_alpha.owner"],
  category: ["fixture_alpha.category"],
} as const satisfies Record<AlphaListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const AlphaListSchema = z.object({
  id: z.string(),
  title: z.object({
    title: z.string(),
  }),
  status: z.object({
    status: z.string(),
  }),
  owner: z.object({
    owner: z.string(),
  }),
  category: z.object({
    category: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const AlphaListPatchSchema = z.object({
  title: z
    .object({
      title: z.string().optional(),
    })
    .optional(),
  status: z
    .object({
      status: z.string().optional(),
    })
    .optional(),
  owner: z
    .object({
      owner: z.string().optional(),
    })
    .optional(),
  category: z
    .object({
      category: z.string().optional(),
    })
    .optional(),
});

export type AlphaListDto = z.infer<typeof AlphaListSchema>;
export type AlphaListPatchDto = z.infer<typeof AlphaListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const alphaListSurfacePolicyDef = defineSurfacePolicy({
  surface: "alpha_list",
  fieldIds: Object.values(AlphaListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write"],
  kind: "business",
});
