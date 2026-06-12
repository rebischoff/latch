import { withPermissionDb } from "@latch/pg-session";
import type { Pool } from "pg";

export type ResolveLatchUserInput = {
  /** Better Auth subject / session user id. */
  subject: string;
  /** Login email from the provider session (optional bridge to `login_email`). */
  email?: string;
};

const RESOLVE_BY_ID_SQL = `SELECT id FROM latch_users WHERE id = $1`;
const RESOLVE_BY_EMAIL_SQL = `SELECT id FROM latch_users WHERE login_email = $1`;

/**
 * Map a Better Auth subject to stable `latch_users.id`.
 * Tries direct id match first, then `login_email` when email is present.
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
      const byEmail = await client.query<{ id: string }>(
        RESOLVE_BY_EMAIL_SQL,
        [input.email],
      );
      if (byEmail.rows[0]?.id) {
        return byEmail.rows[0].id;
      }
    }

    return input.subject;
  });
