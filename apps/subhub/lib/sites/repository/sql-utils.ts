import type { Pool, PoolClient } from "pg";

export const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code: string }).code === "23505";

export const isForeignKeyViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code: string }).code === "23503";

export const tableExists = async (
  client: Pool | PoolClient,
  table: string,
): Promise<boolean> => {
  const result = await client.query<{ exists: boolean }>(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`public.${table}`],
  );
  return result.rows[0]?.exists ?? false;
};

export const escapeLikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, (match) => `\\${match}`);
