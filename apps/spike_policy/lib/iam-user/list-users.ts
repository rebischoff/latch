import type { Pool } from "pg";

export type ActAsUserOption = {
  id: string;
  displayName: string;
};

export const listUsersForActAs = async (
  pool: Pool,
): Promise<ActAsUserOption[]> => {
  const result = await pool.query<{ id: string; display_name: string }>(
    "SELECT id, display_name FROM latch_users ORDER BY id",
  );
  return result.rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
  }));
};
