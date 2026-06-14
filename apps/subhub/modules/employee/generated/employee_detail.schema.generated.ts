// DO NOT EDIT — generated from employee_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const EmployeeDetailFieldIds = {
  profile: "profile",
  account_link: "account_link",
} as const;

export type EmployeeDetailFieldId = (typeof EmployeeDetailFieldIds)[keyof typeof EmployeeDetailFieldIds];

export const employeeDetailColumnMap = {
  profile: ["party.id", "party.kind", "party.display_name", "party.legal_name", "party.notes"],
  account_link: ["employee.latch_user_id"],
} as const satisfies Record<EmployeeDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const EmployeeDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    kind: z.string(),
    display_name: z.string(),
    legal_name: z.string().nullable(),
    notes: z.string().nullable(),
  }),
  account_link: z.object({
    latch_user_id: z.string().nullable(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const EmployeeDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      kind: z.string().optional(),
      display_name: z.string().optional(),
      legal_name: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    })
    .optional(),
  account_link: z
    .object({
      latch_user_id: z.string().nullable().optional(),
    })
    .optional(),
});

export type EmployeeDetailDto = z.infer<typeof EmployeeDetailSchema>;
export type EmployeeDetailPatchDto = z.infer<typeof EmployeeDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const employeeDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "employee_detail",
  fieldIds: Object.values(EmployeeDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
