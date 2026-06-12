import type { Principal, RoleBinding, RoleClass, RoleId, ScopeId } from "./types.js";
/** System catalog classes are always company-wide — never scoped. */
export declare const isSystemRoleClass: (roleClass: RoleClass) => boolean;
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
export declare const normalizePrincipalBindings: (rows: PrincipalBindingRow[]) => RoleBinding[];
/** Distinct role ids held by the principal (grant lookup / synthesis). */
export declare const principalRoleIds: (principal: Principal) => RoleId[];
/** Whether the principal holds a role (any scope binding counts). */
export declare const principalHoldsRole: (principal: Principal, roleId: RoleId) => boolean;
/**
 * Build a {@link Principal} from flat role ids (company-wide / unscoped).
 * Test harnesses and stubs use this until scoped fixtures exist.
 */
export declare const principalWithRoles: (id: string, roleIds: RoleId[], extras?: Pick<Principal, "roleClasses" | "policyVersion">) => Principal;
//# sourceMappingURL=principal.d.ts.map