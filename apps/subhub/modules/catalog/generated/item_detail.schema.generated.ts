// DO NOT EDIT — generated from item_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const ItemDetailFieldIds = {
  profile: "profile",
  commercial: "commercial",
  item_labor_phase: "item_labor_phase",
  resolved_labor_phase: "resolved_labor_phase",
  spec_definitions: "spec_definitions",
} as const;

export type ItemDetailFieldId = (typeof ItemDetailFieldIds)[keyof typeof ItemDetailFieldIds];

export const itemDetailColumnMap = {
  profile: ["item.id", "item.name", "item.parent_id", "item.node_type", "item.sort_order", "item.csi_code"],
  commercial: ["item.freight_rate_type_id", "item.incidental_rate_type_id", "item.markup_type_id", "item.fallback_unit_cost", "item.material_phase_id"],
  item_labor_phase: [],
  resolved_labor_phase: [],
  spec_definitions: [],
} as const satisfies Record<ItemDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const ItemDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    name: z.string(),
    parent_id: z.string().nullable(),
    node_type: z.string(),
    sort_order: z.number(),
    csi_code: z.string().nullable(),
  }),
  commercial: z.object({
    freight_rate_type_id: z.string().nullable(),
    incidental_rate_type_id: z.string().nullable(),
    markup_type_id: z.string().nullable(),
    fallback_unit_cost: z.number(),
    material_phase_id: z.string().nullable(),
  }),
  item_labor_phase: z.array(z.object({ user_id: z.string() })),
  resolved_labor_phase: z.array(z.object({ user_id: z.string() })),
  spec_definitions: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const ItemDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      parent_id: z.string().nullable().optional(),
      node_type: z.string().optional(),
      sort_order: z.number().optional(),
      csi_code: z.string().nullable().optional(),
    })
    .optional(),
  commercial: z
    .object({
      freight_rate_type_id: z.string().nullable().optional(),
      incidental_rate_type_id: z.string().nullable().optional(),
      markup_type_id: z.string().nullable().optional(),
      fallback_unit_cost: z.number().optional(),
      material_phase_id: z.string().nullable().optional(),
    })
    .optional(),
  item_labor_phase: z.array(z.object({ user_id: z.string() })).optional(),
  resolved_labor_phase: z.array(z.object({ user_id: z.string() })).optional(),
  spec_definitions: z.array(z.object({ user_id: z.string() })).optional(),
});

export type ItemDetailDto = z.infer<typeof ItemDetailSchema>;
export type ItemDetailPatchDto = z.infer<typeof ItemDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const itemDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "item_detail",
  fieldIds: Object.values(ItemDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
