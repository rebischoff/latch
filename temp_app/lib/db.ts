import { createDatabaseConnections } from "@latch/adapter-neon";
import type { DatabaseConnections } from "@latch/pg-session";

let connections: DatabaseConnections | undefined;

/** Dual-pool Postgres connections (`@latch/adapter-neon`). */
export const getConnections = (): DatabaseConnections => {
  if (!connections) {
    connections = createDatabaseConnections();
  }
  return connections;
};

/** Runtime pooled connection for DAL, auth, and audit bootstrap. */
export const getPool = () => getConnections().pool;
