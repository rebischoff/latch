/**
 * Database client placeholder.
 * Phase 1: wire pg/Drizzle/Prisma using process.env.DATABASE_URL.
 */
export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}
