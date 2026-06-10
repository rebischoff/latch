import type { PermissionContext } from "@latch/contracts";
import type { Principal } from "@latch/contracts";
import type { Pool } from "pg";

import { spikePolicyRegistry } from "../policy-registry.js";
import { createPolicyServiceForPrincipal } from "../request-policy.js";

/** Resolve actor manifest for the `role_detail` IAM surface. */
export const buildRoleDetailContext = async (
  pool: Pool,
  principal: Principal,
): Promise<PermissionContext> => {
  const policy = await createPolicyServiceForPrincipal(
    pool,
    principal,
    spikePolicyRegistry,
  );
  const manifest = policy.resolve(principal, { surface: "role_detail" });
  return { principal, manifest, surface: "role_detail" };
};
