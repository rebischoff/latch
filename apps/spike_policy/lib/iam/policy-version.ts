import { withPermissionDb } from "@latch/audit";
import type { Pool } from "pg";

import {
  bumpMemoryPolicyVersion,
  getMemoryPolicyVersion,
  resetMemoryPolicyVersion,
} from "./policy-version-memory.js";

export {
  bumpMemoryPolicyVersion,
  getMemoryPolicyVersion,
  resetMemoryPolicyVersion,
} from "./policy-version-memory.js";

export { getPolicyVersion } from "./policy-version-read.js";

/**
 * Increment `latch_policy_version` after role-editor grant/binding changes.
 * Falls back to the in-memory counter when `pool` is omitted.
 */
export const bumpPolicyVersion = async (
  principalId: string,
  pool?: Pool,
): Promise<number> => {
  if (!pool) {
    return bumpMemoryPolicyVersion();
  }

  const result = await withPermissionDb(pool, principalId, async (client) =>
    client.query<{ version: string }>(
      "UPDATE latch_policy_version SET version = version + 1 WHERE id = 1 RETURNING version",
    ),
  );
  const raw = result.rows[0]?.version;
  return raw != null ? Number(raw) : bumpMemoryPolicyVersion();
};
