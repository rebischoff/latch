import type { PoolClient } from "pg";

import { authCredentialLookupKeys } from "./latch-credential-keys";
import type { ResolveLatchUserInput } from "./resolve-latch-user-id";

const RESOLVE_BY_ID_SQL = `SELECT id FROM latch_users WHERE id = $1`;
const RESOLVE_BY_LOGIN_SQL = `SELECT id FROM latch_users WHERE login_name = $1 OR login_email = $1`;

/** Map a Better Auth subject to `latch_users.id` using an open transaction client. */
export const resolveLatchUserIdOnClient = async (
  client: Pick<PoolClient, "query">,
  input: ResolveLatchUserInput,
): Promise<string> => {
  const byId = await client.query<{ id: string }>(RESOLVE_BY_ID_SQL, [
    input.subject,
  ]);
  if (byId.rows[0]?.id) {
    return byId.rows[0].id;
  }

  if (input.email) {
    for (const key of authCredentialLookupKeys(input.email)) {
      const byLogin = await client.query<{ id: string }>(RESOLVE_BY_LOGIN_SQL, [
        key,
      ]);
      if (byLogin.rows[0]?.id) {
        return byLogin.rows[0].id;
      }
    }
  }

  return input.subject;
};
