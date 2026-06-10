// DO NOT EDIT — generated from zeta_inventory.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const ZetaInventoryFieldIds = {
  sku: "sku",
  quantity: "quantity",
  location: "location",
  reorder_level: "reorder_level",
  supplier: "supplier",
} as const;

export type ZetaInventoryFieldId = (typeof ZetaInventoryFieldIds)[keyof typeof ZetaInventoryFieldIds];

export const zetaInventoryColumnMap = {
  sku: ["fixture_zeta.sku"],
  quantity: ["fixture_zeta.quantity"],
  location: ["fixture_zeta.location"],
  reorder_level: ["fixture_zeta.reorder_level"],
  supplier: ["fixture_zeta.supplier"],
} as const satisfies Record<ZetaInventoryFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const ZetaInventorySchema = z.object({
  id: z.string(),
  sku: z.object({
    sku: z.string(),
  }),
  quantity: z.object({
    quantity: z.number(),
  }),
  location: z.object({
    location: z.string(),
  }),
  reorder_level: z.object({
    reorder_level: z.number(),
  }),
  supplier: z.object({
    supplier: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const ZetaInventoryPatchSchema = z.object({
  sku: z
    .object({
      sku: z.string().optional(),
    })
    .optional(),
  quantity: z
    .object({
      quantity: z.number().optional(),
    })
    .optional(),
  location: z
    .object({
      location: z.string().optional(),
    })
    .optional(),
  reorder_level: z
    .object({
      reorder_level: z.number().optional(),
    })
    .optional(),
  supplier: z
    .object({
      supplier: z.string().optional(),
    })
    .optional(),
});

export type ZetaInventoryDto = z.infer<typeof ZetaInventorySchema>;
export type ZetaInventoryPatchDto = z.infer<typeof ZetaInventoryPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const zetaInventorySurfacePolicyDef = defineSurfacePolicy({
  surface: "zeta_inventory",
  fieldIds: Object.values(ZetaInventoryFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write"],
  kind: "business",
});
