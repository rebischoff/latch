import { Pool } from "pg";

let pool: Pool | undefined;

/** Shared Postgres pool from `DATABASE_URL` (`.env.local`). */
export const getPool = (): Pool => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set — copy apps/__APP_SLUG__/.env.example to .env.local",
      );
    }
    pool = new Pool({ connectionString });
  }
  return pool;
};
