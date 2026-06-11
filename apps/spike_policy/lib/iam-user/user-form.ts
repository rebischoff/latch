import { z } from "zod";

import type { ProjectedUserRolesDetail } from "./project.js";
import {
  bindingsToDtos,
  roleAssignmentDto,
  type RoleAssignmentDto,
} from "./role-assignment.js";

const RoleAssignmentSchema = z
  .object({
    role_id: z.string().uuid(),
    scope_id: z.string().uuid().nullable(),
  })
  .strict();

export const UserCreateSchema = z
  .object({
    id: z.string().trim().min(1, "User id is required"),
    display_name: z.string().trim().min(1, "Display name is required"),
    role_assignments: z.array(RoleAssignmentSchema).optional(),
  })
  .strict();

export type UserCreateInput = z.infer<typeof UserCreateSchema>;

export type UserCreateFormValues = {
  id: string;
  display_name: string;
  role_ids: string[];
  scope_id: string | null;
};

export const userCreateFormValuesToInput = (
  values: UserCreateFormValues,
): UserCreateInput => {
  const roleIds = values.role_ids;
  const bindings: RoleAssignmentDto[] =
    roleIds.length > 0
      ? roleIds.map((roleId) =>
          roleAssignmentDto(roleId, values.scope_id),
        )
      : [];

  return {
    id: values.id.trim(),
    display_name: values.display_name.trim(),
    role_assignments: bindings.length > 0 ? bindings : undefined,
  };
};

export type UserDetailFormValues = {
  display_name?: string;
  role_ids: string[];
  scope_id: string | null;
};

export const userDetailToFormValues = (
  user: ProjectedUserRolesDetail,
): UserDetailFormValues => {
  const assignments = user.role_assignments ?? [];
  const roleIds = [...new Set(assignments.map((a) => a.role_id))].sort();
  const scopeIds = [
    ...new Set(
      assignments
        .map((a) => a.scope_id)
        .filter((id): id is string => id !== null),
    ),
  ];
  const scopeId = scopeIds.length === 1 ? scopeIds[0]! : null;

  return {
    display_name: user.profile?.display_name,
    role_ids: roleIds,
    scope_id: scopeId,
  };
};

export const userFormValuesToPatch = (
  values: UserDetailFormValues,
): { role_assignments: RoleAssignmentDto[] } => ({
  role_assignments: values.role_ids.map((roleId) =>
    roleAssignmentDto(roleId, values.scope_id),
  ),
});
