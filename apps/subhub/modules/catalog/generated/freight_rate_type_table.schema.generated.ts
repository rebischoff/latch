// DO NOT EDIT — generated from freight_rate_type_table.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const FreightRateTypeTableFieldIds = {
  name: "name",
  percent: "percent",
  amount_cents: "amount_cents",
  sort_order: "sort_order",
} as const;

export type FreightRateTypeTableFieldId = (typeof FreightRateTypeTableFieldIds)[keyof typeof FreightRateTypeTableFieldIds];

export const freightRateTypeTableColumnMap = {
  name: ["cost_add_on_type.id", "cost_add_on_type.name"],
  percent: ["cost_add_on_type.percent"],
  amount_cents: ["cost_add_on_type.amount_cents"],
  sort_order: ["cost_add_on_type.sort_order"],
} as const satisfies Record<FreightRateTypeTableFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const FreightRateTypeTableSchema = z.object({
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
export const FreightRateTypeTablePatchSchema = z.object({
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

export type FreightRateTypeTableDto = z.infer<typeof FreightRateTypeTableSchema>;
export type FreightRateTypeTablePatchDto = z.infer<typeof FreightRateTypeTablePatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const freightRateTypeTableSurfacePolicyDef = defineSurfacePolicy({
  surface: "freight_rate_type_table",
  fieldIds: Object.values(FreightRateTypeTableFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
