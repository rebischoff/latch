// DO NOT EDIT — generated from employee_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const EmployeeListFieldIds = {
  summary: "summary",
} as const;

export type EmployeeListFieldId = (typeof EmployeeListFieldIds)[keyof typeof EmployeeListFieldIds];

export const employeeListColumnMap = {
  summary: ["party.id", "party.display_name", "party_person.latch_user_id"],
} as const satisfies Record<EmployeeListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const EmployeeListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    display_name: z.string(),
    latch_user_id: z.string().nullable(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const EmployeeListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      display_name: z.string().optional(),
      latch_user_id: z.string().nullable().optional(),
    })
    .optional(),
});

export type EmployeeListDto = z.infer<typeof EmployeeListSchema>;
export type EmployeeListPatchDto = z.infer<typeof EmployeeListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const employeeListSurfacePolicyDef = defineSurfacePolicy({
  surface: "employee_list",
  fieldIds: Object.values(EmployeeListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "create"],
});
