// DO NOT EDIT — generated from complexity_factor_table.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const ComplexityFactorTableFieldIds = {
  name: "name",
  factor_percent: "factor_percent",
  sort_order: "sort_order",
} as const;

export type ComplexityFactorTableFieldId = (typeof ComplexityFactorTableFieldIds)[keyof typeof ComplexityFactorTableFieldIds];

export const complexityFactorTableColumnMap = {
  name: ["complexity_factor.id", "complexity_factor.name"],
  factor_percent: ["complexity_factor.factor_percent"],
  sort_order: ["complexity_factor.sort_order"],
} as const satisfies Record<ComplexityFactorTableFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const ComplexityFactorTableSchema = z.object({
  id: z.string(),
  name: z.object({
    id: z.string(),
    name: z.string(),
  }),
  factor_percent: z.object({
    factor_percent: z.number(),
  }),
  sort_order: z.object({
    sort_order: z.number(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const ComplexityFactorTablePatchSchema = z.object({
  name: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  factor_percent: z
    .object({
      factor_percent: z.number().optional(),
    })
    .optional(),
  sort_order: z
    .object({
      sort_order: z.number().optional(),
    })
    .optional(),
});

export type ComplexityFactorTableDto = z.infer<typeof ComplexityFactorTableSchema>;
export type ComplexityFactorTablePatchDto = z.infer<typeof ComplexityFactorTablePatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const complexityFactorTableSurfacePolicyDef = defineSurfacePolicy({
  surface: "complexity_factor_table",
  fieldIds: Object.values(ComplexityFactorTableFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
