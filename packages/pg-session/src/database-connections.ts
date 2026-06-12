import type { Pool } from "pg";

/** Server-only Postgres pools: pooled runtime + direct migrate/psql. */
export type DatabaseConnections = {
  /** Pooled runtime connection (`latch_app` role in the Neon adapter). */
  pool: Pool;
  /** Direct connection for migrate/psql (owner credentials; not rewritten). */
  directPool: Pool;
};
