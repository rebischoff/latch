// DO NOT EDIT — hand-synced from role_detail.surface.yaml (spike harness; run codegen when wired)

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const RoleDetailFieldIds = {
  catalog: "catalog",
  surface_bindings: "surface_bindings",
  grants: "grants",
} as const;

export type RoleDetailFieldId =
  (typeof RoleDetailFieldIds)[keyof typeof RoleDetailFieldIds];

export const roleDetailColumnMap = {
  catalog: ["latch_roles.id", "latch_roles.display_name", "latch_roles.role_class"],
  surface_bindings: [],
  grants: [],
} as const satisfies Record<RoleDetailFieldId, readonly string[]>;

const RowScopeSchema = z.enum(["own", "all"]);

export const SurfaceBindingSchema = z.object({
  surface_id: z.string(),
  row_scope: RowScopeSchema.nullable(),
});

export const GrantRowSchema = z.object({
  surface_id: z.string(),
  field_id: z.string().nullable(),
  action: z.string(),
});

/** Full read DTO keyed by Field id (narrow with manifest for read). */
export const RoleDetailSchema = z.object({
  id: z.string().uuid(),
  catalog: z
    .object({
      id: z.string().uuid(),
      display_name: z.string(),
      role_class: z.enum(["system_data", "system_iam", "app"]),
    })
    .optional(),
  surface_bindings: z.array(SurfaceBindingSchema).optional(),
  grants: z.array(GrantRowSchema).optional(),
});

/** PATCH body keyed by Field id (strict — unknown keys rejected by DAL). */
export const RoleDetailPatchSchema = z
  .object({
    catalog: z
      .object({
        display_name: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
    surface_bindings: z.array(SurfaceBindingSchema).optional(),
    grants: z.array(GrantRowSchema).optional(),
  })
  .strict();

export const RoleDetailCreateSchema = z
  .object({
    display_name: z.string().min(1),
  })
  .strict();

export type RoleDetailDto = z.infer<typeof RoleDetailSchema>;
export type RoleDetailPatchDto = z.infer<typeof RoleDetailPatchSchema>;
export type RoleDetailCreateDto = z.infer<typeof RoleDetailCreateSchema>;
export type SurfaceBindingDto = z.infer<typeof SurfaceBindingSchema>;
export type GrantRowDto = z.infer<typeof GrantRowSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const roleDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "role_detail",
  fieldIds: Object.values(RoleDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
  kind: "iam",
});
