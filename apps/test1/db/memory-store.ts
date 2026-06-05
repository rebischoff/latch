/**
 * Scaffold (task 05) — in-memory IAM when `DATABASE_URL` is unset.
 * Replace or drop when test1 requires Postgres for all dev (task 10+ / hardening).
 */
export type MemoryUserRecord = {
  id: string;
  displayName: string;
  loginEmail: string;
};

/** In-memory latch tables until Neon is configured (task 05). */
export class MemoryUserStore {
  users = new Map<string, MemoryUserRecord>();
  /** user id → role ids (mirrors `latch_user_roles`) */
  rolesByUser = new Map<string, string[]>();
  emailToUserId = new Map<string, string>();

  clear = (): void => {
    this.users.clear();
    this.rolesByUser.clear();
    this.emailToUserId.clear();
  };

  upsertUser = (row: MemoryUserRecord): void => {
    this.users.set(row.id, row);
    this.emailToUserId.set(row.loginEmail, row.id);
  };

  getUser = (id: string): MemoryUserRecord | undefined => this.users.get(id);

  resolveUserIdByEmail = (loginEmail: string): string | undefined =>
    this.emailToUserId.get(loginEmail);

  listRolesForUser = (userId: string): string[] =>
    [...(this.rolesByUser.get(userId) ?? [])];

  setUserRoles = (userId: string, roleIds: string[]): void => {
    this.rolesByUser.set(userId, [...roleIds]);
  };
}
