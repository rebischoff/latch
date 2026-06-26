// DO NOT EDIT — generated from employee_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const EmployeeDetailFieldIds = {
  profile: "profile",
  phones: "phones",
  emails: "emails",
  staff: "staff",
} as const;

export type EmployeeDetailFieldId = (typeof EmployeeDetailFieldIds)[keyof typeof EmployeeDetailFieldIds];

export const employeeDetailColumnMap = {
  profile: ["party.id", "party.display_name", "party_person.first_name", "party_person.last_name", "party_person.nick_name", "party_person.avatar_url"],
  phones: [],
  emails: [],
  staff: ["employee.party_id"],
} as const satisfies Record<EmployeeDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const EmployeeDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    display_name: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    nick_name: z.string().nullable(),
    avatar_url: z.string().nullable(),
  }),
  phones: z.array(z.object({ user_id: z.string() })),
  emails: z.array(z.object({ user_id: z.string() })),
  staff: z.object({
    party_id: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const EmployeeDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      display_name: z.string().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      nick_name: z.string().nullable().optional(),
      avatar_url: z.string().nullable().optional(),
    })
    .optional(),
  phones: z.array(z.object({ user_id: z.string() })).optional(),
  emails: z.array(z.object({ user_id: z.string() })).optional(),
  staff: z
    .object({
      party_id: z.string().optional(),
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
  surfaceActions: ["read", "write", "delete", "add_as_db_user"],
});
