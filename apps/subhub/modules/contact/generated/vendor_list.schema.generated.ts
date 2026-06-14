// DO NOT EDIT — generated from vendor_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const VendorListFieldIds = {
  summary: "summary",
} as const;

export type VendorListFieldId = (typeof VendorListFieldIds)[keyof typeof VendorListFieldIds];

export const vendorListColumnMap = {
  summary: ["party.id", "party.display_name", "party.kind"],
} as const satisfies Record<VendorListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const VendorListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    display_name: z.string(),
    kind: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const VendorListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      display_name: z.string().optional(),
      kind: z.string().optional(),
    })
    .optional(),
});

export type VendorListDto = z.infer<typeof VendorListSchema>;
export type VendorListPatchDto = z.infer<typeof VendorListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const vendorListSurfacePolicyDef = defineSurfacePolicy({
  surface: "vendor_list",
  fieldIds: Object.values(VendorListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
});
