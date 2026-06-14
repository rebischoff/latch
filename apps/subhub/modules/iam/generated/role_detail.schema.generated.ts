// DO NOT EDIT — generated from role_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const RoleDetailFieldIds = {
  catalog: "catalog",
  surface_bindings: "surface_bindings",
  grants: "grants",
} as const;

export type RoleDetailFieldId = (typeof RoleDetailFieldIds)[keyof typeof RoleDetailFieldIds];

export const roleDetailColumnMap = {
  catalog: ["latch_roles.id", "latch_roles.role_class", "latch_roles.display_name"],
  surface_bindings: ["latch_role_surfaces.surface_id", "latch_role_surfaces.row_scope"],
  grants: ["latch_role_grants.surface_id", "latch_role_grants.field_id", "latch_role_grants.action", "latch_role_grants.mode"],
} as const satisfies Record<RoleDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const RoleDetailSchema = z.object({
  id: z.string(),
  catalog: z.object({
    id: z.string(),
    role_class: z.string(),
    display_name: z.string(),
  }),
  surface_bindings: z.object({
    surface_id: z.string(),
    row_scope: z.string().nullable(),
  }),
  grants: z.object({
    surface_id: z.string(),
    field_id: z.string().nullable(),
    action: z.string(),
    mode: z.string().nullable(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const RoleDetailPatchSchema = z.object({
  catalog: z
    .object({
      id: z.string().optional(),
      role_class: z.string().optional(),
      display_name: z.string().optional(),
    })
    .optional(),
  surface_bindings: z
    .object({
      surface_id: z.string().optional(),
      row_scope: z.string().nullable().optional(),
    })
    .optional(),
  grants: z
    .object({
      surface_id: z.string().optional(),
      field_id: z.string().nullable().optional(),
      action: z.string().optional(),
      mode: z.string().nullable().optional(),
    })
    .optional(),
});

export type RoleDetailDto = z.infer<typeof RoleDetailSchema>;
export type RoleDetailPatchDto = z.infer<typeof RoleDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const roleDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "role_detail",
  fieldIds: Object.values(RoleDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
  kind: "iam",
});
