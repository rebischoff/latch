import type { DatabaseConnections } from "@latch/pg-session";
import { Pool } from "pg";

import {
  resolveDatabaseEnv,
  type DatabaseEnv,
} from "./resolve-database-env.js";

/**
 * Hosting adapter: dual Neon URLs over standard `pg`.
 * - `DATABASE_URL` — pooled runtime (`latch_app` credentials)
 * - `DATABASE_URL_DIRECT` — migrate/psql (owner URL; defaults to `DATABASE_URL`)
 * - `LATCH_APP_ROLE_PASSWORD` — `latch_app` login password
 */
export const createDatabaseConnections = (
  env: DatabaseEnv = process.env as DatabaseEnv,
): DatabaseConnections => {
  const resolved = resolveDatabaseEnv(env);

  return {
    pool: new Pool({ connectionString: resolved.runtimeConnectionString }),
    directPool: new Pool({ connectionString: resolved.directConnectionString }),
  };
};
