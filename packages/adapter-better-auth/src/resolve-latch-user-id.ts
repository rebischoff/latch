import { withPermissionDb } from "@latch/pg-session";
import type { Pool } from "pg";

const LATCH_AUTH_EMAIL_SUFFIX = "@latch.local";

const credentialLookupKeys = (identifier: string): string[] => {
  const normalized = identifier.trim().toLowerCase();
  const keys = new Set<string>([normalized]);

  if (normalized.endsWith(LATCH_AUTH_EMAIL_SUFFIX)) {
    keys.add(normalized.slice(0, -LATCH_AUTH_EMAIL_SUFFIX.length));
  }

  return [...keys];
};

export type ResolveLatchUserInput = {
  /** Better Auth subject / session user id. */
  subject: string;
  /** Login email or username from the provider session (bridges to `login_email` / `login_name`). */
  email?: string;
};

const RESOLVE_BY_ID_SQL = `SELECT id FROM latch_users WHERE id = $1`;
const RESOLVE_BY_LOGIN_SQL = `SELECT id FROM latch_users WHERE login_name = $1 OR login_email = $1`;

/**
 * Map a Better Auth subject to stable `latch_users.id`.
 * Tries direct id match first, then `login_name` / `login_email` when identifier is present.
 * Falls back to the provider subject when no row matches (empty role bindings).
 */
export const resolveLatchUserId = async (
  pool: Pool,
  input: ResolveLatchUserInput,
): Promise<string> =>
  withPermissionDb(pool, input.subject, async (client) => {
    const byId = await client.query<{ id: string }>(RESOLVE_BY_ID_SQL, [
      input.subject,
    ]);
    if (byId.rows[0]?.id) {
      return byId.rows[0].id;
    }

    if (input.email) {
      for (const key of credentialLookupKeys(input.email)) {
        const byLogin = await client.query<{ id: string }>(
          RESOLVE_BY_LOGIN_SQL,
          [key],
        );
        if (byLogin.rows[0]?.id) {
          return byLogin.rows[0].id;
        }
      }
    }

    return input.subject;
  });
