import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

import { MemoryUserStore } from "./memory-user-store.js";
import type { UserRoleBinding } from "./role-assignment.js";

type PgUserRow = {
  id: string;
  display_name: string;
};

type PgAssignmentRow = {
  user_id: string;
  role_id: string;
  scope_id: string | null;
};

/** Load users + assignments from Postgres into an in-memory store for DAL operations. */
export const hydrateMemoryUserStoreFromPg = async (
  client: PoolClient,
): Promise<MemoryUserStore> => {
  const store = new MemoryUserStore();

  const usersResult = await client.query<PgUserRow>(
    "SELECT id, display_name FROM latch_users",
  );
  for (const row of usersResult.rows) {
    store.upsertUser({ id: row.id, displayName: row.display_name });
  }

  const assignmentsResult = await client.query<PgAssignmentRow>(
    "SELECT user_id, role_id, scope_id FROM latch_user_roles",
  );
  const byUser = new Map<string, UserRoleBinding[]>();
  for (const row of assignmentsResult.rows) {
    const list = byUser.get(row.user_id) ?? [];
    list.push({ roleId: row.role_id, scopeId: row.scope_id });
    byUser.set(row.user_id, list);
  }
  for (const [userId, bindings] of byUser) {
    store.setUserBindings(userId, bindings);
  }

  return store;
};

/** Insert a new user row after an in-memory DAL create. */
export const persistUserToPg = async (
  client: PoolClient,
  store: MemoryUserStore,
  userId: string,
): Promise<void> => {
  const user = store.getUser(userId);
  if (!user) {
    throw new Error(`User ${userId} not found in store`);
  }

  const existing = await client.query<{ id: string }>(
    "SELECT id FROM latch_users WHERE id = $1",
    [userId],
  );
  if (existing.rows.length > 0) {
    throw new ValidationError(`User id already exists: ${userId}`);
  }

  await client.query(
    "INSERT INTO latch_users (id, display_name) VALUES ($1, $2)",
    [user.id, user.displayName],
  );
};

/** Persist assignment rows for one user after an in-memory DAL mutation. */
export const persistUserRolesToPg = async (
  client: PoolClient,
  store: MemoryUserStore,
  userId: string,
): Promise<void> => {
  await client.query("DELETE FROM latch_user_roles WHERE user_id = $1", [userId]);
  for (const binding of store.listBindingsForUser(userId)) {
    await client.query(
      "INSERT INTO latch_user_roles (user_id, role_id, scope_id) VALUES ($1, $2, $3)",
      [userId, binding.roleId, binding.scopeId],
    );
  }
};
