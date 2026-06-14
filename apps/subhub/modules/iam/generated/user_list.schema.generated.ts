// DO NOT EDIT — generated from user_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const UserListFieldIds = {
  summary: "summary",
} as const;

export type UserListFieldId = (typeof UserListFieldIds)[keyof typeof UserListFieldIds];

export const userListColumnMap = {
  summary: ["latch_users.id", "latch_users.login_name", "latch_users.login_email"],
} as const satisfies Record<UserListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const UserListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    login_name: z.string().nullable(),
    login_email: z.string().nullable(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const UserListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      login_name: z.string().nullable().optional(),
      login_email: z.string().nullable().optional(),
    })
    .optional(),
});

export type UserListDto = z.infer<typeof UserListSchema>;
export type UserListPatchDto = z.infer<typeof UserListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const userListSurfacePolicyDef = defineSurfacePolicy({
  surface: "user_list",
  fieldIds: Object.values(UserListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
  kind: "iam",
});
