import { randomUUID } from "node:crypto";

import { ConflictError, ForbiddenError } from "@latch/contracts";

export type RoleClass = "system_data" | "system_iam" | "app";

export type RoleRecord = {
  id: string;
  roleClass: RoleClass;
  displayName: string;
};

export type SurfaceBindingRecord = {
  surfaceId: string;
  rowScope: "own" | "all" | null;
};

export type GrantRecord = {
  surfaceId: string;
  fieldId: string | null;
  action: string;
};

export type RoleRelatedData = {
  bindings: SurfaceBindingRecord[];
  grants: GrantRecord[];
};

const isSystemRole = (role: RoleRecord): boolean => role.roleClass !== "app";

export class MemoryRoleStore {
  private readonly roles = new Map<string, RoleRecord>();
  private readonly bindings = new Map<string, SurfaceBindingRecord[]>();
  private readonly grants = new Map<string, GrantRecord[]>();
  private readonly assignments = new Map<string, Set<string>>();

  constructor(seed?: {
    roles?: RoleRecord[];
    bindings?: Record<string, SurfaceBindingRecord[]>;
    grants?: Record<string, GrantRecord[]>;
    assignments?: Record<string, string[]>;
  }) {
    for (const role of seed?.roles ?? []) {
      this.roles.set(role.id, { ...role });
    }
    for (const [roleId, rows] of Object.entries(seed?.bindings ?? {})) {
      this.bindings.set(roleId, rows.map((row) => ({ ...row })));
    }
    for (const [roleId, rows] of Object.entries(seed?.grants ?? {})) {
      this.grants.set(roleId, rows.map((row) => ({ ...row })));
    }
    for (const [roleId, userIds] of Object.entries(seed?.assignments ?? {})) {
      this.assignments.set(roleId, new Set(userIds));
    }
  }

  listRoleIds = (): string[] => [...this.roles.keys()];

  get = (id: string): RoleRecord | undefined => {
    const role = this.roles.get(id);
    return role ? { ...role } : undefined;
  };

  getRelated = (roleId: string): RoleRelatedData => ({
    bindings: (this.bindings.get(roleId) ?? []).map((row) => ({ ...row })),
    grants: (this.grants.get(roleId) ?? []).map((row) => ({ ...row })),
  });

  createRole = (displayName: string): RoleRecord => {
    const role: RoleRecord = {
      id: randomUUID(),
      roleClass: "app",
      displayName,
    };
    this.roles.set(role.id, role);
    this.bindings.set(role.id, []);
    this.grants.set(role.id, []);
    return { ...role };
  };

  upsert = (role: RoleRecord): void => {
    if (isSystemRole(role)) {
      throw new ForbiddenError("System catalog roles are not editable");
    }
    this.roles.set(role.id, { ...role });
  };

  replaceBindings = (roleId: string, bindings: SurfaceBindingRecord[]): void => {
    this.bindings.set(
      roleId,
      bindings.map((row) => ({ ...row })),
    );
  };

  replaceGrants = (roleId: string, grants: GrantRecord[]): void => {
    this.grants.set(
      roleId,
      grants.map((row) => ({ ...row })),
    );
  };

  hasAssignments = (roleId: string): boolean =>
    (this.assignments.get(roleId)?.size ?? 0) > 0;

  addAssignment = (roleId: string, userId: string): void => {
    const set = this.assignments.get(roleId) ?? new Set<string>();
    set.add(userId);
    this.assignments.set(roleId, set);
  };

  deleteRole = (id: string): void => {
    const role = this.roles.get(id);
    if (!role) {
      return;
    }
    if (isSystemRole(role)) {
      throw new ForbiddenError("System catalog roles are not deletable");
    }
    if (this.hasAssignments(id)) {
      throw new ConflictError(
        "Role is assigned to users — revoke via user_roles_detail first",
      );
    }
    this.roles.delete(id);
    this.bindings.delete(id);
    this.grants.delete(id);
  };
}

/** Default system catalog rows for unit tests (UUIDs are arbitrary). */
export const seedSystemRoles = (): RoleRecord[] => [
  {
    id: "11111111-1111-4111-8111-111111111111",
    roleClass: "system_data",
    displayName: "Data master",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    roleClass: "system_iam",
    displayName: "IAM master",
  },
];
