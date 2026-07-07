// DO NOT EDIT — generated from incidental_rate_type_table.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const IncidentalRateTypeTableFieldIds = {
  name: "name",
  percent: "percent",
  amount_cents: "amount_cents",
  sort_order: "sort_order",
} as const;

export type IncidentalRateTypeTableFieldId = (typeof IncidentalRateTypeTableFieldIds)[keyof typeof IncidentalRateTypeTableFieldIds];

export const incidentalRateTypeTableColumnMap = {
  name: ["cost_add_on_type.id", "cost_add_on_type.name"],
  percent: ["cost_add_on_type.percent"],
  amount_cents: ["cost_add_on_type.amount_cents"],
  sort_order: ["cost_add_on_type.sort_order"],
} as const satisfies Record<IncidentalRateTypeTableFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const IncidentalRateTypeTableSchema = z.object({
  id: z.string(),
  name: z.object({
    id: z.string(),
    name: z.string(),
  }),
  percent: z.object({
    percent: z.number(),
  }),
  amount_cents: z.object({
    amount_cents: z.number(),
  }),
  sort_order: z.object({
    sort_order: z.number(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const IncidentalRateTypeTablePatchSchema = z.object({
  name: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  percent: z
    .object({
      percent: z.number().optional(),
    })
    .optional(),
  amount_cents: z
    .object({
      amount_cents: z.number().optional(),
    })
    .optional(),
  sort_order: z
    .object({
      sort_order: z.number().optional(),
    })
    .optional(),
});

export type IncidentalRateTypeTableDto = z.infer<typeof IncidentalRateTypeTableSchema>;
export type IncidentalRateTypeTablePatchDto = z.infer<typeof IncidentalRateTypeTablePatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const incidentalRateTypeTableSurfacePolicyDef = defineSurfacePolicy({
  surface: "incidental_rate_type_table",
  fieldIds: Object.values(IncidentalRateTypeTableFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
