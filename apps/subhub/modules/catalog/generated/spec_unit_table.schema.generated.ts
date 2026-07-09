// DO NOT EDIT — generated from spec_unit_table.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const SpecUnitTableFieldIds = {
  symbol: "symbol",
  name: "name",
  dimension: "dimension",
  canonical_unit_id: "canonical_unit_id",
  to_canonical_factor: "to_canonical_factor",
  sort_order: "sort_order",
} as const;

export type SpecUnitTableFieldId = (typeof SpecUnitTableFieldIds)[keyof typeof SpecUnitTableFieldIds];

export const specUnitTableColumnMap = {
  symbol: ["spec_unit.symbol"],
  name: ["spec_unit.id", "spec_unit.name"],
  dimension: ["spec_unit.dimension"],
  canonical_unit_id: ["spec_unit.canonical_unit_id"],
  to_canonical_factor: ["spec_unit.to_canonical_factor"],
  sort_order: ["spec_unit.sort_order"],
} as const satisfies Record<SpecUnitTableFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const SpecUnitTableSchema = z.object({
  id: z.string(),
  symbol: z.object({
    symbol: z.string(),
  }),
  name: z.object({
    id: z.string(),
    name: z.string(),
  }),
  dimension: z.object({
    dimension: z.string(),
  }),
  canonical_unit_id: z.object({
    canonical_unit_id: z.string(),
  }),
  to_canonical_factor: z.object({
    to_canonical_factor: z.number(),
  }),
  sort_order: z.object({
    sort_order: z.number(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const SpecUnitTablePatchSchema = z.object({
  symbol: z
    .object({
      symbol: z.string().optional(),
    })
    .optional(),
  name: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  dimension: z
    .object({
      dimension: z.string().optional(),
    })
    .optional(),
  canonical_unit_id: z
    .object({
      canonical_unit_id: z.string().optional(),
    })
    .optional(),
  to_canonical_factor: z
    .object({
      to_canonical_factor: z.number().optional(),
    })
    .optional(),
  sort_order: z
    .object({
      sort_order: z.number().optional(),
    })
    .optional(),
});

export type SpecUnitTableDto = z.infer<typeof SpecUnitTableSchema>;
export type SpecUnitTablePatchDto = z.infer<typeof SpecUnitTablePatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const specUnitTableSurfacePolicyDef = defineSurfacePolicy({
  surface: "spec_unit_table",
  fieldIds: Object.values(SpecUnitTableFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
