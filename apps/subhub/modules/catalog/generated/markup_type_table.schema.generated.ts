// DO NOT EDIT — generated from markup_type_table.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const MarkupTypeTableFieldIds = {
  name: "name",
  material_markup_percent: "material_markup_percent",
  labor_markup_percent: "labor_markup_percent",
  sort_order: "sort_order",
} as const;

export type MarkupTypeTableFieldId = (typeof MarkupTypeTableFieldIds)[keyof typeof MarkupTypeTableFieldIds];

export const markupTypeTableColumnMap = {
  name: ["markup_type.id", "markup_type.name"],
  material_markup_percent: ["markup_type.material_markup_percent"],
  labor_markup_percent: ["markup_type.labor_markup_percent"],
  sort_order: ["markup_type.sort_order"],
} as const satisfies Record<MarkupTypeTableFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const MarkupTypeTableSchema = z.object({
  id: z.string(),
  name: z.object({
    id: z.string(),
    name: z.string(),
  }),
  material_markup_percent: z.object({
    material_markup_percent: z.number(),
  }),
  labor_markup_percent: z.object({
    labor_markup_percent: z.number(),
  }),
  sort_order: z.object({
    sort_order: z.number(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const MarkupTypeTablePatchSchema = z.object({
  name: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  material_markup_percent: z
    .object({
      material_markup_percent: z.number().optional(),
    })
    .optional(),
  labor_markup_percent: z
    .object({
      labor_markup_percent: z.number().optional(),
    })
    .optional(),
  sort_order: z
    .object({
      sort_order: z.number().optional(),
    })
    .optional(),
});

export type MarkupTypeTableDto = z.infer<typeof MarkupTypeTableSchema>;
export type MarkupTypeTablePatchDto = z.infer<typeof MarkupTypeTablePatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const markupTypeTableSurfacePolicyDef = defineSurfacePolicy({
  surface: "markup_type_table",
  fieldIds: Object.values(MarkupTypeTableFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
