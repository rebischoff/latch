// DO NOT EDIT — generated from user_roles_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const UserRolesDetailFieldIds = {
  profile: "profile",
  role_assignments: "role_assignments",
} as const;

export type UserRolesDetailFieldId = (typeof UserRolesDetailFieldIds)[keyof typeof UserRolesDetailFieldIds];

export const userRolesDetailColumnMap = {
  profile: ["latch_users.id", "latch_users.login_name", "latch_users.login_email"],
  role_assignments: ["latch_user_roles.role_id"],
} as const satisfies Record<UserRolesDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const UserRolesDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    login_name: z.string().nullable(),
    login_email: z.string().nullable(),
  }),
  role_assignments: z.object({
    role_id: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const UserRolesDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      login_name: z.string().nullable().optional(),
      login_email: z.string().nullable().optional(),
    })
    .optional(),
  role_assignments: z
    .object({
      role_id: z.string().optional(),
    })
    .optional(),
});

export type UserRolesDetailDto = z.infer<typeof UserRolesDetailSchema>;
export type UserRolesDetailPatchDto = z.infer<typeof UserRolesDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const userRolesDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "user_roles_detail",
  fieldIds: Object.values(UserRolesDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write"],
  kind: "iam",
});
