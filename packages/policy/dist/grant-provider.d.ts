import type { FieldAction, FieldPolicyGrant, RoleId, RowScope, SurfaceId } from "@latch/contracts";
/** One role's runtime grants on a surface (loaded from DB or memory in tests). */
export interface RoleGrant {
    rowScope?: RowScope;
    fields: FieldPolicyGrant[];
    surfaceActions?: FieldAction[];
}
/** Runtime source for role→Field grants (DB-backed in apps; memory in tests). */
export interface RoleGrantProvider {
    grantsFor(roleIds: RoleId[], surface: SurfaceId): RoleGrant[];
}
/** Default provider when none is configured — no runtime grants. */
export declare const emptyRoleGrantProvider: RoleGrantProvider;
export type MemoryRoleGrantBinding = RoleGrant & {
    roleId: RoleId;
    surface: SurfaceId;
};
/** In-memory provider for tests and local harnesses. */
export declare class MemoryRoleGrantProvider implements RoleGrantProvider {
    private readonly byKey;
    constructor(bindings?: MemoryRoleGrantBinding[]);
    grantsFor(roleIds: RoleId[], surface: SurfaceId): RoleGrant[];
}
/** Shorthand: nested map surface → role → grant. */
export declare const createMemoryRoleGrantProvider: (bindings: Partial<Record<SurfaceId, Partial<Record<RoleId, RoleGrant>>>>) => MemoryRoleGrantProvider;
//# sourceMappingURL=grant-provider.d.ts.map