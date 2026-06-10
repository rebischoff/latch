import { surfaceAllows } from "@latch/contracts";
import type { Principal } from "@latch/contracts";
import type { Pool } from "pg";

import { spikePolicyRegistry } from "./policy-registry";
import { createPolicyServiceForPrincipal } from "./request-policy";

export type IamNavAccess = {
  users: boolean;
  roles: boolean;
};

/** Whether the current actor may open the IAM console nav targets. */
export const resolveIamNavAccess = async (
  pool: Pool,
  principal: Principal,
): Promise<IamNavAccess> => {
  const policy = await createPolicyServiceForPrincipal(
    pool,
    principal,
    spikePolicyRegistry,
  );

  const usersManifest = policy.resolve(principal, { surface: "user_roles_detail" });
  const rolesManifest = policy.resolve(principal, { surface: "role_detail" });

  return {
    users: surfaceAllows(usersManifest, "read"),
    roles: surfaceAllows(rolesManifest, "read"),
  };
};
