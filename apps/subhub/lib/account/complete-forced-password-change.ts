import { hashLatchPassword } from "@latch/adapter-better-auth";

import { getAuth, getPool, getPrincipal } from "../latch";
import { syncMemoryCredentialPassword } from "./sync-memory-credential";

export class ForcedPasswordChangeNotRequiredError extends Error {
  constructor() {
    super("Password change is not required");
    this.name = "ForcedPasswordChangeNotRequiredError";
  }
}

export const completeForcedPasswordChange = async (
  newPassword: string,
): Promise<void> => {
  const principal = await getPrincipal();
  const pool = getPool();

  const userResult = await pool.query<{
    login_name: string | null;
    login_email: string | null;
    must_change_password: boolean;
  }>(
    `SELECT login_name, login_email, must_change_password
     FROM latch_users
     WHERE id = $1`,
    [principal.id],
  );

  const row = userResult.rows[0];
  if (!row?.must_change_password) {
    throw new ForcedPasswordChangeNotRequiredError();
  }

  const passwordHash = await hashLatchPassword(newPassword);

  await pool.query(
    `UPDATE latch_users
     SET password_hash = $2, must_change_password = false
     WHERE id = $1`,
    [principal.id, passwordHash],
  );

  await syncMemoryCredentialPassword(getAuth(), {
    loginName: row.login_name,
    loginEmail: row.login_email,
    password: newPassword,
    passwordHash,
  });
};
