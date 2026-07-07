// DO NOT EDIT — generated from labor_phase_table.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const LaborPhaseTableFieldIds = {
  name: "name",
  sort_order: "sort_order",
} as const;

export type LaborPhaseTableFieldId = (typeof LaborPhaseTableFieldIds)[keyof typeof LaborPhaseTableFieldIds];

export const laborPhaseTableColumnMap = {
  name: ["labor_phase.id", "labor_phase.name"],
  sort_order: ["labor_phase.sort_order"],
} as const satisfies Record<LaborPhaseTableFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const LaborPhaseTableSchema = z.object({
  id: z.string(),
  name: z.object({
    id: z.string(),
    name: z.string(),
  }),
  sort_order: z.object({
    sort_order: z.number(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const LaborPhaseTablePatchSchema = z.object({
  name: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  sort_order: z
    .object({
      sort_order: z.number().optional(),
    })
    .optional(),
});

export type LaborPhaseTableDto = z.infer<typeof LaborPhaseTableSchema>;
export type LaborPhaseTablePatchDto = z.infer<typeof LaborPhaseTablePatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const laborPhaseTableSurfacePolicyDef = defineSurfacePolicy({
  surface: "labor_phase_table",
  fieldIds: Object.values(LaborPhaseTableFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
