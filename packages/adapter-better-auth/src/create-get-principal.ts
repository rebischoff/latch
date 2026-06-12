import { principalWithRoles, type Principal } from "@latch/contracts";
import type { Pool } from "pg";

import { loadPrincipalFromDb } from "./load-principal-from-db.js";
import type { ProviderSession } from "./provider-session.js";
import { resolveLatchUserId } from "./resolve-latch-user-id.js";

export type GetPrincipal = () => Promise<Principal>;

export type CreateGetPrincipalOptions = {
  readSession: () => Promise<ProviderSession | null>;
  /** When set, roles/scopes load from Postgres via `loadPrincipalFromDb`. */
  pool?: Pool | (() => Pool | undefined);
  /** Override subject → `latch_users.id` mapping (defaults to {@link resolveLatchUserId}). */
  resolveUserId?: (session: ProviderSession, pool: Pool) => Promise<string>;
  /** Override principal load (defaults to {@link loadPrincipalFromDb}). */
  loadPrincipal?: (pool: Pool, userId: string) => Promise<Principal>;
};

const readPool = (
  pool: Pool | (() => Pool | undefined) | undefined,
): Pool | undefined => (typeof pool === "function" ? pool() : pool);

/**
 * Identity port: Better Auth session supplies subject (+ optional email);
 * {@link Principal} id, bindings, and `roleClasses` always come from the DB.
 */
export const createGetPrincipal = (
  options: CreateGetPrincipalOptions,
): GetPrincipal => {
  const loadPrincipal = options.loadPrincipal ?? loadPrincipalFromDb;
  const resolveUserId =
    options.resolveUserId ??
    ((session, pool) =>
      resolveLatchUserId(pool, {
        subject: session.userId,
        email: session.email,
      }));

  return async (): Promise<Principal> => {
    const session = await options.readSession();
    if (session) {
      const pool = readPool(options.pool);
      if (!pool) {
        throw new Error(
          "DATABASE_URL is required to resolve a Better Auth session to a Principal",
        );
      }
      const latchUserId = await resolveUserId(session, pool);
      return loadPrincipal(pool, latchUserId);
    }

    const stubUser = process.env.LATCH_STUB_USER?.trim();
    if (stubUser) {
      const pool = readPool(options.pool);
      if (pool) {
        const exists = await pool.query<{ exists: boolean }>(
          "SELECT EXISTS (SELECT 1 FROM latch_users WHERE id = $1) AS exists",
          [stubUser],
        );
        if (exists.rows[0]?.exists) {
          return loadPrincipal(pool, stubUser);
        }
      }

      const stubRole = process.env.LATCH_STUB_ROLE?.trim();
      if (stubRole) {
        return principalWithRoles(stubUser, [stubRole]);
      }
    }

    throw new Error("No session");
  };
};
