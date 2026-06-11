import type { UserRoleBinding } from "./role-assignment.js";
import { unscopedRoleIds } from "./role-assignment.js";

export type MemoryUserRecord = {
  id: string;
  displayName: string;
};

/**
 * In-memory users + assignments for harness tests (mirrors `latch_users` / `latch_user_roles`).
 */
export class MemoryUserStore {
  readonly users = new Map<string, MemoryUserRecord>();
  /** user id → scoped role bindings */
  readonly bindingsByUser = new Map<string, UserRoleBinding[]>();

  clear = (): void => {
    this.users.clear();
    this.bindingsByUser.clear();
  };

  upsertUser = (user: MemoryUserRecord): void => {
    this.users.set(user.id, { ...user });
  };

  getUser = (id: string): MemoryUserRecord | undefined => this.users.get(id);

  listBindingsForUser = (userId: string): UserRoleBinding[] =>
    [...(this.bindingsByUser.get(userId) ?? [])].sort((a, b) =>
      a.roleId.localeCompare(b.roleId),
    );

  /** Unique role ids held by the user (any scope). */
  listRolesForUser = (userId: string): string[] =>
    unscopedRoleIds(this.listBindingsForUser(userId));

  setUserBindings = (userId: string, bindings: UserRoleBinding[]): void => {
    const unique = new Map<string, UserRoleBinding>();
    for (const binding of bindings) {
      const key = `${binding.roleId}\0${binding.scopeId ?? ""}`;
      unique.set(key, binding);
    }
    const sorted = [...unique.values()].sort((a, b) =>
      a.roleId.localeCompare(b.roleId),
    );
    if (sorted.length === 0) {
      this.bindingsByUser.delete(userId);
      return;
    }
    this.bindingsByUser.set(userId, sorted);
  };

  /** Convenience for unscoped harness seeds. */
  setUserRoles = (userId: string, roleIds: string[]): void => {
    this.setUserBindings(
      userId,
      roleIds.map((roleId) => ({ roleId, scopeId: null })),
    );
  };

  listUsersWithRole = (roleId: string): string[] =>
    [...this.bindingsByUser.entries()]
      .filter(([, bindings]) => bindings.some((b) => b.roleId === roleId))
      .map(([userId]) => userId)
      .sort();
}
