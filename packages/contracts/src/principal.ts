import type { Principal, RoleBinding, RoleId } from "./types.js";

/** Distinct role ids held by the principal (grant lookup / synthesis). */
export const principalRoleIds = (principal: Principal): RoleId[] => {
  const seen = new Set<RoleId>();
  const ids: RoleId[] = [];
  for (const binding of principal.bindings) {
    if (!seen.has(binding.roleId)) {
      seen.add(binding.roleId);
      ids.push(binding.roleId);
    }
  }
  return ids;
};

/** Whether the principal holds a role (any scope binding counts). */
export const principalHoldsRole = (
  principal: Principal,
  roleId: RoleId,
): boolean => principal.bindings.some((b) => b.roleId === roleId);

/**
 * Build a {@link Principal} from flat role ids (company-wide / unscoped).
 * Test harnesses and stubs use this until scoped fixtures exist.
 */
export const principalWithRoles = (
  id: string,
  roleIds: RoleId[],
  extras?: Pick<Principal, "roleClasses" | "policyVersion">,
): Principal => ({
  id,
  bindings: roleIds.map(
    (roleId): RoleBinding => ({ roleId, scopeId: null }),
  ),
  ...extras,
});
