import { withPermissionDb } from "@latch/pg-session";
import type { Pool } from "pg";

import { authCredentialLookupKeys } from "./latch-credential-keys";
import { resolveLatchUserIdOnClient } from "./resolve-latch-user-id-on-client";

export type ResolveLatchUserInput = {
  /** Better Auth subject / session user id. */
  subject: string;
  /** Login email or username from the provider session (bridges to `login_email` / `login_name`). */
  email?: string;
};

/**
 * Map a Better Auth subject to stable `latch_users.id`.
 * Tries direct id match first, then `login_name` / `login_email` when identifier is present.
 * Falls back to the provider subject when no row matches (empty role bindings).
 */
export const resolveLatchUserId = async (
  pool: Pool,
  input: ResolveLatchUserInput,
): Promise<string> =>
  withPermissionDb(pool, input.subject, async (client) =>
    resolveLatchUserIdOnClient(client, input),
  );
