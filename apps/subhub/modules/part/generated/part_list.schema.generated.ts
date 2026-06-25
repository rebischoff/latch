// DO NOT EDIT — generated from part_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const PartListFieldIds = {
  summary: "summary",
} as const;

export type PartListFieldId = (typeof PartListFieldIds)[keyof typeof PartListFieldIds];

export const partListColumnMap = {
  summary: ["manufacturer_part.id", "manufacturer_part.mpn", "manufacturer_part.description", "manufacturer_part.manufacturer_party_id", "party.display_name"],
} as const satisfies Record<PartListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const PartListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    mpn: z.string(),
    description: z.string(),
    manufacturer_party_id: z.string(),
    display_name: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const PartListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      mpn: z.string().optional(),
      description: z.string().optional(),
      manufacturer_party_id: z.string().optional(),
      display_name: z.string().optional(),
    })
    .optional(),
});

export type PartListDto = z.infer<typeof PartListSchema>;
export type PartListPatchDto = z.infer<typeof PartListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const partListSurfacePolicyDef = defineSurfacePolicy({
  surface: "part_list",
  fieldIds: Object.values(PartListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
});
