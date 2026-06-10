import type { Manifest, SurfaceId } from "@latch/contracts";
import type { PolicyRegistry } from "@latch/policy";
import type { Pool } from "pg";

import {
  createPolicyServiceForPrincipal,
  loadPrincipalFromDb,
} from "../request-policy.js";

/** Resolve merged effective manifests for every surface in the registry. */
export const resolveAllManifests = async (
  pool: Pool,
  userId: string,
  registry: PolicyRegistry,
): Promise<Record<SurfaceId, Manifest>> => {
  const principal = await loadPrincipalFromDb(pool, userId);
  const policy = await createPolicyServiceForPrincipal(pool, principal, registry);
  const manifests = {} as Record<SurfaceId, Manifest>;

  for (const surfaceId of Object.keys(registry)) {
    manifests[surfaceId] = policy.resolve(principal, { surface: surfaceId });
  }

  return manifests;
};
