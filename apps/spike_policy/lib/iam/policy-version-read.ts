import type { Pool } from "pg";

import { getMemoryPolicyVersion } from "./policy-version-memory.js";

/** Read current global permission generation (nav badge). No @latch/audit import. */
export const getPolicyVersion = async (pool?: Pool): Promise<number> => {
  if (!pool) {
    return getMemoryPolicyVersion();
  }

  const result = await pool.query<{ version: string }>(
    "SELECT version FROM latch_policy_version WHERE id = 1",
  );
  const raw = result.rows[0]?.version;
  return raw != null ? Number(raw) : getMemoryPolicyVersion();
};
