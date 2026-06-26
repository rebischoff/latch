// DO NOT EDIT — generated from role_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const RoleListFieldIds = {
  summary: "summary",
} as const;

export type RoleListFieldId = (typeof RoleListFieldIds)[keyof typeof RoleListFieldIds];

export const roleListColumnMap = {
  summary: ["latch_roles.id", "latch_roles.role_class", "latch_roles.display_name"],
} as const satisfies Record<RoleListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const RoleListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    role_class: z.string(),
    display_name: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const RoleListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      role_class: z.string().optional(),
      display_name: z.string().optional(),
    })
    .optional(),
});

export type RoleListDto = z.infer<typeof RoleListSchema>;
export type RoleListPatchDto = z.infer<typeof RoleListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const roleListSurfacePolicyDef = defineSurfacePolicy({
  surface: "role_list",
  fieldIds: Object.values(RoleListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "create"],
  kind: "iam",
});
