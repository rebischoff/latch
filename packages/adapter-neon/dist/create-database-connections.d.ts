import type { DatabaseConnections } from "@latch/pg-session";
import { type DatabaseEnv } from "./resolve-database-env.js";
/**
 * Hosting adapter: dual Neon URLs over standard `pg`.
 * - `DATABASE_URL` — pooled runtime (`latch_app` credentials)
 * - `DATABASE_URL_DIRECT` — migrate/psql (owner URL; defaults to `DATABASE_URL`)
 * - `LATCH_APP_ROLE_PASSWORD` — `latch_app` login password
 */
export declare const createDatabaseConnections: (env?: DatabaseEnv) => DatabaseConnections;
//# sourceMappingURL=create-database-connections.d.ts.map