import type { Principal } from "@latch/contracts";

import { loadRolesForUser } from "../iam/load-roles";
import { resolveLatchUserId } from "../iam/resolve-latch-user";

import { readProviderSession } from "./provider-session";

/**
 * Resolves the request principal: Better Auth session supplies provider user id + email;
 * `Principal.id` is the stable `latch_users.id` (resolved by login email when seeded).
 * Roles come from `latch_user_roles` (Postgres when `DATABASE_URL` is set, else memory store).
 *
 * For automated tests only: when no session, `LATCH_STUB_USER` + `LATCH_STUB_ROLE` apply
 * (env role only — not merged with seed DB rows — so CI threat/e2e stay deterministic).
 */
export const getPrincipal = async (): Promise<Principal> => {
  const session = await readProviderSession();
  if (session) {
    const latchUserId = await resolveLatchUserId(session.email, session.userId);
    return {
      id: latchUserId,
      roles: await loadRolesForUser(latchUserId),
    };
  }

  const stubUser = process.env.LATCH_STUB_USER;
  const stubRole = process.env.LATCH_STUB_ROLE;
  if (stubUser && stubRole) {
    return { id: stubUser, roles: [stubRole] };
  }

  throw new Error("No session");
};
