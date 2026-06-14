// DO NOT EDIT — generated from user_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const UserDetailFieldIds = {
  profile: "profile",
} as const;

export type UserDetailFieldId = (typeof UserDetailFieldIds)[keyof typeof UserDetailFieldIds];

export const userDetailColumnMap = {
  profile: ["latch_users.id", "latch_users.login_name", "latch_users.login_email"],
} as const satisfies Record<UserDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const UserDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    login_name: z.string().nullable(),
    login_email: z.string().nullable(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const UserDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      login_name: z.string().nullable().optional(),
      login_email: z.string().nullable().optional(),
    })
    .optional(),
});

export type UserDetailDto = z.infer<typeof UserDetailSchema>;
export type UserDetailPatchDto = z.infer<typeof UserDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const userDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "user_detail",
  fieldIds: Object.values(UserDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write"],
  kind: "iam",
});
