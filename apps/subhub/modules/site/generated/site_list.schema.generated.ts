// DO NOT EDIT — generated from site_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const SiteListFieldIds = {
  summary: "summary",
} as const;

export type SiteListFieldId = (typeof SiteListFieldIds)[keyof typeof SiteListFieldIds];

export const siteListColumnMap = {
  summary: ["site.id", "site.name"],
} as const satisfies Record<SiteListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const SiteListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const SiteListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
});

export type SiteListDto = z.infer<typeof SiteListSchema>;
export type SiteListPatchDto = z.infer<typeof SiteListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const siteListSurfacePolicyDef = defineSurfacePolicy({
  surface: "site_list",
  fieldIds: Object.values(SiteListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
});
