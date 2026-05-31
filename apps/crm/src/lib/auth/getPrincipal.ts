import type { Principal } from "@latch/contracts";

import { readSessionCookie } from "./session.js";

/**
 * Resolves the request principal from the session cookie.
 * For automated tests only: when no cookie, `LATCH_STUB_USER` + `LATCH_STUB_ROLE` apply.
 */
export const getPrincipal = async (): Promise<Principal> => {
  const session = await readSessionCookie();
  if (session) {
    return { id: session.userId, roles: session.roles };
  }

  const stubUser = process.env.LATCH_STUB_USER;
  const stubRole = process.env.LATCH_STUB_ROLE;
  if (stubUser && stubRole) {
    return { id: stubUser, roles: [stubRole] };
  }

  throw new Error("No session");
};
