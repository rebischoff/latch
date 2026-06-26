import { cache } from "react";

import { getPool, getPrincipal } from "./latch";
import { isAuthenticated } from "./auth-session";

/** Whether the signed-in latch user must complete `/change-password-required`. */
export const readMustChangePassword = cache(async (): Promise<boolean> => {
  if (!(await isAuthenticated())) {
    return false;
  }

  const principal = await getPrincipal();
  const result = await getPool().query<{ must_change_password: boolean }>(
    `SELECT must_change_password FROM latch_users WHERE id = $1`,
    [principal.id],
  );

  return result.rows[0]?.must_change_password ?? false;
});
