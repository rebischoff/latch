import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  roleListDescriptor,
  type RoleListRow,
} from "../../modules/iam/generated/role_list.glue.generated";
import {
  userDetailDescriptor,
  type UserDetailRow,
} from "../../modules/iam/generated/user_detail.glue.generated";
import {
  userListDescriptor,
  type UserListRow,
} from "../../modules/iam/generated/user_list.glue.generated";

export {
  roleListDescriptor,
  userDetailDescriptor,
  userListDescriptor,
  type RoleListRow,
  type UserDetailRow,
  type UserListRow,
};

export type UserRolesRow = {
  id: string;
  login_name: string | null;
  login_email: string | null;
};

export const UserRolesDetailPatchSchema = z
  .object({
    role_assignments: z.array(z.string()).optional(),
  })
  .strict();

export type RoleGrantTuple = {
  surface_id: string;
  field_id: string | null;
  action: string;
  mode: string | null;
};

export type SurfaceBindingTuple = {
  surface_id: string;
  row_scope: string | null;
};

export type RoleDetailRow = {
  id: string;
  role_class: string;
  display_name: string;
};

export type RoleDetailRelated = {
  surfaceBindings: SurfaceBindingTuple[];
  grants: RoleGrantTuple[];
};

export type RoleDetailRelatedPatch = {
  surfaceBindings?: SurfaceBindingTuple[];
  grants?: RoleGrantTuple[];
};

export type RoleDetailStoreRelated = RoleDetailRelated | RoleDetailRelatedPatch;

const normalizeRoleDetailRelated = (
  related: RoleDetailStoreRelated,
): RoleDetailRelated => ({
  surfaceBindings: related.surfaceBindings ?? [],
  grants: related.grants ?? [],
});

export const RoleDetailPatchSchema = z
  .object({
    catalog: z
      .object({
        display_name: z.string().optional(),
      })
      .optional(),
    surface_bindings: z
      .array(
        z.object({
          surface_id: z.string(),
          row_scope: z.string().nullable().optional(),
        }),
      )
      .optional(),
    grants: z
      .array(
        z.object({
          surface_id: z.string(),
          field_id: z.string().nullable(),
          action: z.string(),
          mode: z.string().nullable().optional(),
        }),
      )
      .optional(),
  })
  .strict();

const formatUserRolesRow = (row: UserRolesRow): Record<string, unknown> => ({
  id: row.id,
  login_name: row.login_name,
  login_email: row.login_email,
});

export const projectUserRolesRow = (
  row: UserRolesRow,
  manifest: Manifest,
  related: string[],
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = {
      id: row.id,
      login_name: row.login_name,
      login_email: row.login_email,
    };
  }

  if (manifest.fields.role_assignments?.includes("read")) {
    dto.role_assignments = related;
  }

  return dto;
};

export const applyUserRolesPatch = (
  row: UserRolesRow,
  _patch: Record<string, unknown>,
): UserRolesRow => row;

export const userRolesDetailDescriptor: SurfaceDescriptor<
  UserRolesRow,
  string[]
> = {
  surfaceId: "user_roles_detail",
  anchorTable: "latch_users",
  capabilities: ["detail"],
  patchSchema: UserRolesDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: (row, manifest, related) =>
    projectUserRolesRow(row, manifest, related),
  applyPatch: applyUserRolesPatch,
  applyRelatedPatch: (_entityId, patch) => {
    const typed = patch as z.infer<typeof UserRolesDetailPatchSchema>;
    if (typed.role_assignments !== undefined) {
      return typed.role_assignments;
    }
    return undefined;
  },
  auditSnapshot: formatUserRolesRow,
  canDelete: () => false,
};

const formatRoleDetailRow = (row: RoleDetailRow): Record<string, unknown> => ({
  display_name: row.display_name,
  id: row.id,
  role_class: row.role_class,
});

const isSystemRoleClass = (roleClass: string): boolean =>
  roleClass === "system_data" || roleClass === "system_iam";

export const projectRoleDetailRow = (
  row: RoleDetailRow,
  manifest: Manifest,
  related: RoleDetailStoreRelated,
): Record<string, unknown> => {
  const normalized = normalizeRoleDetailRelated(related);
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.catalog?.includes("read")) {
    dto.catalog = {
      id: row.id,
      role_class: row.role_class,
      display_name: row.display_name,
    };
  }

  if (manifest.fields.surface_bindings?.includes("read")) {
    dto.surface_bindings = normalized.surfaceBindings;
  }

  if (manifest.fields.grants?.includes("read")) {
    dto.grants = normalized.grants;
  }

  return dto;
};

export const applyRoleDetailPatch = (
  row: RoleDetailRow,
  patch: Record<string, unknown>,
): RoleDetailRow => {
  if (isSystemRoleClass(row.role_class)) {
    return row;
  }

  const next = { ...row };
  const typed = patch as z.infer<typeof RoleDetailPatchSchema>;

  if (typed.catalog?.display_name !== undefined) {
    next.display_name = typed.catalog.display_name;
  }

  return next;
};

export const roleDetailDescriptor: SurfaceDescriptor<
  RoleDetailRow,
  RoleDetailStoreRelated
> = {
  surfaceId: "role_detail",
  anchorTable: "latch_roles",
  capabilities: ["detail"],
  patchSchema: RoleDetailPatchSchema,
  deleteAuditFieldId: "catalog",
  projectRow: (row, manifest, related) =>
    projectRoleDetailRow(row, manifest, related),
  applyPatch: applyRoleDetailPatch,
  applyRelatedPatch: (_entityId, patch) => {
    const typed = patch as z.infer<typeof RoleDetailPatchSchema>;
    const related: RoleDetailRelatedPatch = {};

    if (typed.surface_bindings !== undefined) {
      related.surfaceBindings = typed.surface_bindings.map((binding) => ({
        surface_id: binding.surface_id,
        row_scope: binding.row_scope ?? null,
      }));
    }

    if (typed.grants !== undefined) {
      related.grants = typed.grants.map((grant) => ({
        surface_id: grant.surface_id,
        field_id: grant.field_id,
        action: grant.action,
        mode: grant.mode ?? null,
      }));
    }

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatRoleDetailRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
