import type { Principal } from "@latch/contracts";

import { loadRolesForUser } from "@/lib/iam/load-roles";
import { getPolicyVersion } from "@/lib/iam/policy-version";

import { readProviderSession } from "./provider-session.js";

/**
 * Resolves the request principal: Auth.js session supplies user id only; roles come from DB/store.
 * For automated tests only: when no session, `LATCH_STUB_USER` + `LATCH_STUB_ROLE` apply
 * (env role only — not merged with seed DB rows — so CI threat/e2e stay deterministic).
 *
 * `policyVersion` is loaded from `latch_policy_version` when `DATABASE_URL` is set.
 * Stub principals omit it — manifest cache treats `undefined` as its own key bucket.
 */
export const getPrincipal = async (): Promise<Principal> => {
  const session = await readProviderSession();
  if (session) {
    const policyVersion = await getPolicyVersion(session.userId);
    return {
      id: session.userId,
      roles: await loadRolesForUser(session.userId),
      ...(policyVersion !== undefined ? { policyVersion } : {}),
    };
  }

  const stubUser = process.env.LATCH_STUB_USER;
  const stubRole = process.env.LATCH_STUB_ROLE;
  if (stubUser && stubRole) {
    return { id: stubUser, roles: [stubRole] };
  }

  throw new Error("No session");
};
