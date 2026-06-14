// DO NOT EDIT — generated from manufacturer_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const ManufacturerListFieldIds = {
  summary: "summary",
} as const;

export type ManufacturerListFieldId = (typeof ManufacturerListFieldIds)[keyof typeof ManufacturerListFieldIds];

export const manufacturerListColumnMap = {
  summary: ["party.id", "party.display_name", "party.kind"],
} as const satisfies Record<ManufacturerListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const ManufacturerListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    display_name: z.string(),
    kind: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const ManufacturerListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      display_name: z.string().optional(),
      kind: z.string().optional(),
    })
    .optional(),
});

export type ManufacturerListDto = z.infer<typeof ManufacturerListSchema>;
export type ManufacturerListPatchDto = z.infer<typeof ManufacturerListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const manufacturerListSurfacePolicyDef = defineSurfacePolicy({
  surface: "manufacturer_list",
  fieldIds: Object.values(ManufacturerListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
});
