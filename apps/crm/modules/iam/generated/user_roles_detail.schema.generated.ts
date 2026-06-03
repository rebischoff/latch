// DO NOT EDIT — generated from user_roles_detail.surface.yaml

import { z } from "zod";

export const UserRolesDetailFieldIds = {
  profile: "profile",
  role_assignments: "role_assignments",
} as const;

export type UserRolesDetailFieldId = (typeof UserRolesDetailFieldIds)[keyof typeof UserRolesDetailFieldIds];

export const userRolesDetailColumnMap = {
  profile: ["latch_users.id", "latch_users.display_name"],
  role_assignments: [],
} as const satisfies Record<UserRolesDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const UserRolesDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    display_name: z.string().nullable(),
  }),
  role_assignments: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const UserRolesDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      display_name: z.string().nullable().optional(),
    })
    .optional(),
  role_assignments: z.array(z.object({ user_id: z.string() })).optional(),
});

export type UserRolesDetailDto = z.infer<typeof UserRolesDetailSchema>;
export type UserRolesDetailPatchDto = z.infer<typeof UserRolesDetailPatchSchema>;
