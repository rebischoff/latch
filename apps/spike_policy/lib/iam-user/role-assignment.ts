import type { RoleBinding } from "@latch/contracts";

/** One `latch_user_roles` row projected through `user_roles_detail.role_assignments`. */
export type RoleAssignmentDto = {
  role_id: string;
  scope_id: string | null;
};

export type UserRoleBinding = RoleBinding;

export const roleAssignmentDto = (
  roleId: string,
  scopeId: string | null = null,
): RoleAssignmentDto => ({
  role_id: roleId,
  scope_id: scopeId,
});

export const bindingsToDtos = (
  bindings: UserRoleBinding[],
): RoleAssignmentDto[] =>
  [...bindings]
    .sort(
      (a, b) =>
        a.roleId.localeCompare(b.roleId) ||
        (a.scopeId ?? "").localeCompare(b.scopeId ?? ""),
    )
    .map((b) => roleAssignmentDto(b.roleId, b.scopeId));

export const dtosToBindings = (dtos: RoleAssignmentDto[]): UserRoleBinding[] =>
  dtos.map((dto) => ({ roleId: dto.role_id, scopeId: dto.scope_id }));

export const unscopedRoleIds = (bindings: UserRoleBinding[]): string[] =>
  [...new Set(bindings.map((b) => b.roleId))].sort();

export const roleIdsFromDtos = (dtos: RoleAssignmentDto[]): string[] =>
  unscopedRoleIds(dtosToBindings(dtos));
