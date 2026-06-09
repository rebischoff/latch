// DO NOT EDIT — hand-synced from user_roles_detail.surface.yaml (spike harness; run codegen when wired)

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const UserRolesDetailFieldIds = {
  profile: "profile",
  role_assignments: "role_assignments",
} as const;

export type UserRolesDetailFieldId =
  (typeof UserRolesDetailFieldIds)[keyof typeof UserRolesDetailFieldIds];

export const userRolesDetailColumnMap = {
  profile: ["latch_users.id", "latch_users.display_name"],
  role_assignments: [],
} as const satisfies Record<UserRolesDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with manifest for read). */
export const UserRolesDetailSchema = z.object({
  id: z.string(),
  profile: z
    .object({
      id: z.string(),
      display_name: z.string(),
    })
    .optional(),
  role_assignments: z.array(z.string().uuid()).optional(),
});

/** PATCH body keyed by Field id (strict — unknown keys rejected by DAL). */
export const UserRolesDetailPatchSchema = z
  .object({
    role_assignments: z.array(z.string().uuid()).optional(),
  })
  .strict();

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
