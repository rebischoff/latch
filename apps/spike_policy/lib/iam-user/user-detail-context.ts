import type { PermissionContext, Principal } from "@latch/contracts";
import type { Pool } from "pg";

import { spikePolicyRegistry } from "../policy-registry.js";
import { createPolicyServiceForPrincipal } from "../request-policy.js";

/** Resolve actor manifest for the `user_roles_detail` IAM surface. */
export const buildUserRolesDetailContext = async (
  pool: Pool,
  principal: Principal,
): Promise<PermissionContext> => {
  const policy = await createPolicyServiceForPrincipal(
    pool,
    principal,
    spikePolicyRegistry,
  );
  const manifest = policy.resolve(principal, { surface: "user_roles_detail" });
  return { principal, manifest, surface: "user_roles_detail" };
};
