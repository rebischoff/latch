import type { Pool } from "pg";

export type UserListItem = {
  id: string;
  displayName: string;
};

export const listUsersFromPg = async (pool: Pool): Promise<UserListItem[]> => {
  const result = await pool.query<{ id: string; display_name: string }>(
    "SELECT id, display_name FROM latch_users ORDER BY display_name",
  );

  return result.rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
  }));
};
