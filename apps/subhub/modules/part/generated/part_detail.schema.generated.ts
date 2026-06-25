// DO NOT EDIT — generated from part_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const PartDetailFieldIds = {
  profile: "profile",
  vendor_pricing: "vendor_pricing",
} as const;

export type PartDetailFieldId = (typeof PartDetailFieldIds)[keyof typeof PartDetailFieldIds];

export const partDetailColumnMap = {
  profile: ["manufacturer_part.id", "manufacturer_part.manufacturer_party_id", "manufacturer_part.mpn", "manufacturer_part.description", "manufacturer_part.unit", "manufacturer_part.purchase_unit", "manufacturer_part.units_per_purchase"],
  vendor_pricing: [],
} as const satisfies Record<PartDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const PartDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    manufacturer_party_id: z.string(),
    mpn: z.string(),
    description: z.string(),
    unit: z.string(),
    purchase_unit: z.string().nullable(),
    units_per_purchase: z.number(),
  }),
  vendor_pricing: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const PartDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      manufacturer_party_id: z.string().optional(),
      mpn: z.string().optional(),
      description: z.string().optional(),
      unit: z.string().optional(),
      purchase_unit: z.string().nullable().optional(),
      units_per_purchase: z.number().optional(),
    })
    .optional(),
  vendor_pricing: z.array(z.object({ user_id: z.string() })).optional(),
});

export type PartDetailDto = z.infer<typeof PartDetailSchema>;
export type PartDetailPatchDto = z.infer<typeof PartDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const partDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "part_detail",
  fieldIds: Object.values(PartDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
