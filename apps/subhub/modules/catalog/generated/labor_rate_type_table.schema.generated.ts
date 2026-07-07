// DO NOT EDIT — generated from labor_rate_type_table.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const LaborRateTypeTableFieldIds = {
  name: "name",
  rate_cents: "rate_cents",
  sort_order: "sort_order",
} as const;

export type LaborRateTypeTableFieldId = (typeof LaborRateTypeTableFieldIds)[keyof typeof LaborRateTypeTableFieldIds];

export const laborRateTypeTableColumnMap = {
  name: ["labor_rate_type.id", "labor_rate_type.name"],
  rate_cents: ["labor_rate_type.rate_cents"],
  sort_order: ["labor_rate_type.sort_order"],
} as const satisfies Record<LaborRateTypeTableFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const LaborRateTypeTableSchema = z.object({
  id: z.string(),
  name: z.object({
    id: z.string(),
    name: z.string(),
  }),
  rate_cents: z.object({
    rate_cents: z.number(),
  }),
  sort_order: z.object({
    sort_order: z.number(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const LaborRateTypeTablePatchSchema = z.object({
  name: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  rate_cents: z
    .object({
      rate_cents: z.number().optional(),
    })
    .optional(),
  sort_order: z
    .object({
      sort_order: z.number().optional(),
    })
    .optional(),
});

export type LaborRateTypeTableDto = z.infer<typeof LaborRateTypeTableSchema>;
export type LaborRateTypeTablePatchDto = z.infer<typeof LaborRateTypeTablePatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const laborRateTypeTableSurfacePolicyDef = defineSurfacePolicy({
  surface: "labor_rate_type_table",
  fieldIds: Object.values(LaborRateTypeTableFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
