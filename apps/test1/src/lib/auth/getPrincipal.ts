import type { Principal } from "@latch/contracts";

import { readProviderSession } from "./provider-session";

/**
 * Resolves the request principal: Better Auth session supplies user id only; roles come from DB (task 05).
 * For automated tests only: when no session, `LATCH_STUB_USER` + `LATCH_STUB_ROLE` apply
 * (env role only — not merged with seed DB rows — so CI threat/e2e stay deterministic).
 */
export const getPrincipal = async (): Promise<Principal> => {
  const session = await readProviderSession();
  if (session) {
    return {
      id: session.userId,
      roles: [],
    };
  }

  const stubUser = process.env.LATCH_STUB_USER;
  const stubRole = process.env.LATCH_STUB_ROLE;
  if (stubUser && stubRole) {
    return { id: stubUser, roles: [stubRole] };
  }

  throw new Error("No session");
};
