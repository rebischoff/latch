import type {
  FieldAction,
  FieldPolicyGrant,
  RoleId,
  RowScope,
  SurfaceId,
} from "@latch/contracts";

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

const emptyGrants: RoleGrant[] = [];

/** Default provider when none is configured — no runtime grants. */
export const emptyRoleGrantProvider: RoleGrantProvider = {
  grantsFor: () => emptyGrants,
};

export type MemoryRoleGrantBinding = RoleGrant & {
  roleId: RoleId;
  surface: SurfaceId;
};

/** In-memory provider for tests and local harnesses. */
export class MemoryRoleGrantProvider implements RoleGrantProvider {
  private readonly byKey = new Map<string, RoleGrant>();

  constructor(bindings: MemoryRoleGrantBinding[] = []) {
    for (const binding of bindings) {
      this.byKey.set(`${binding.surface}:${binding.roleId}`, binding);
    }
  }

  grantsFor(roleIds: RoleId[], surface: SurfaceId): RoleGrant[] {
    const grants: RoleGrant[] = [];
    for (const roleId of roleIds) {
      const grant = this.byKey.get(`${surface}:${roleId}`);
      if (grant) {
        grants.push(grant);
      }
    }
    return grants;
  }
}

/** Shorthand: nested map surface → role → grant. */
export const createMemoryRoleGrantProvider = (
  bindings: Partial<Record<SurfaceId, Partial<Record<RoleId, RoleGrant>>>>,
): MemoryRoleGrantProvider => {
  const flat: MemoryRoleGrantBinding[] = [];
  for (const [surface, roles] of Object.entries(bindings)) {
    if (!roles) {
      continue;
    }
    for (const [roleId, grant] of Object.entries(roles)) {
      if (grant) {
        flat.push({ surface, roleId, ...grant });
      }
    }
  }
  return new MemoryRoleGrantProvider(flat);
};
