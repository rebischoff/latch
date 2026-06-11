import type {
  Principal,
  RoleBinding,
  RoleClass,
  RoleId,
  ScopeId,
} from "./types.js";

/** System catalog classes are always company-wide — never scoped. */
export const isSystemRoleClass = (roleClass: RoleClass): boolean =>
  roleClass === "system_data" || roleClass === "system_iam";

/**
 * One assignment row as returned by `latch_user_roles` ⨝ `latch_roles`.
 * Loaders pass this into {@link normalizePrincipalBindings}.
 */
export type PrincipalBindingRow = {
  roleId: RoleId;
  scopeId: ScopeId | null;
  roleClass?: RoleClass;
};

/**
 * Enforce the platform invariant: `system_data` / `system_iam` bindings always
 * emit `scopeId: null`, even when the DB row is corrupt. App roles pass through.
 */
export const normalizePrincipalBindings = (
  rows: PrincipalBindingRow[],
): RoleBinding[] =>
  rows.map((row) => ({
    roleId: row.roleId,
    scopeId:
      row.roleClass != null && isSystemRoleClass(row.roleClass)
        ? null
        : row.scopeId,
  }));

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
