// DO NOT EDIT — generated from site_contact_relation_table.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const SiteContactRelationTableFieldIds = {
  display_name: "display_name",
  sort_order: "sort_order",
} as const;

export type SiteContactRelationTableFieldId = (typeof SiteContactRelationTableFieldIds)[keyof typeof SiteContactRelationTableFieldIds];

export const siteContactRelationTableColumnMap = {
  display_name: ["site_contact_relation.id", "site_contact_relation.display_name"],
  sort_order: ["site_contact_relation.sort_order"],
} as const satisfies Record<SiteContactRelationTableFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const SiteContactRelationTableSchema = z.object({
  id: z.string(),
  display_name: z.object({
    id: z.string(),
    display_name: z.string(),
  }),
  sort_order: z.object({
    sort_order: z.number(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const SiteContactRelationTablePatchSchema = z.object({
  display_name: z
    .object({
      id: z.string().optional(),
      display_name: z.string().optional(),
    })
    .optional(),
  sort_order: z
    .object({
      sort_order: z.number().optional(),
    })
    .optional(),
});

export type SiteContactRelationTableDto = z.infer<typeof SiteContactRelationTableSchema>;
export type SiteContactRelationTablePatchDto = z.infer<typeof SiteContactRelationTablePatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const siteContactRelationTableSurfacePolicyDef = defineSurfacePolicy({
  surface: "site_contact_relation_table",
  fieldIds: Object.values(SiteContactRelationTableFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
