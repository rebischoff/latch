export type MemoryUserRecord = {
  id: string;
  displayName: string;
};

/**
 * In-memory users + assignments for harness tests (mirrors `latch_users` / `latch_user_roles`).
 */
export class MemoryUserStore {
  readonly users = new Map<string, MemoryUserRecord>();
  /** user id → assigned role UUIDs */
  readonly rolesByUser = new Map<string, string[]>();

  clear = (): void => {
    this.users.clear();
    this.rolesByUser.clear();
  };

  upsertUser = (user: MemoryUserRecord): void => {
    this.users.set(user.id, { ...user });
  };

  getUser = (id: string): MemoryUserRecord | undefined => this.users.get(id);

  listRolesForUser = (userId: string): string[] =>
    [...(this.rolesByUser.get(userId) ?? [])].sort();

  setUserRoles = (userId: string, roleIds: string[]): void => {
    const unique = [...new Set(roleIds)].sort();
    if (unique.length === 0) {
      this.rolesByUser.delete(userId);
      return;
    }
    this.rolesByUser.set(userId, unique);
  };

  listUsersWithRole = (roleId: string): string[] =>
    [...this.rolesByUser.entries()]
      .filter(([, roles]) => roles.includes(roleId))
      .map(([userId]) => userId)
      .sort();
}
