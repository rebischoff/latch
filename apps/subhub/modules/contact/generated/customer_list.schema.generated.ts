// DO NOT EDIT — generated from customer_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const CustomerListFieldIds = {
  summary: "summary",
} as const;

export type CustomerListFieldId = (typeof CustomerListFieldIds)[keyof typeof CustomerListFieldIds];

export const customerListColumnMap = {
  summary: ["party.id", "party.display_name", "party.kind"],
} as const satisfies Record<CustomerListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const CustomerListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    display_name: z.string(),
    kind: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const CustomerListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      display_name: z.string().optional(),
      kind: z.string().optional(),
    })
    .optional(),
});

export type CustomerListDto = z.infer<typeof CustomerListSchema>;
export type CustomerListPatchDto = z.infer<typeof CustomerListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const customerListSurfacePolicyDef = defineSurfacePolicy({
  surface: "customer_list",
  fieldIds: Object.values(CustomerListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
});
