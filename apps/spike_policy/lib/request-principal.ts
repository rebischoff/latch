import type { Principal } from "@latch/contracts";

import { getActAsPrincipalId } from "./act-as.js";
import { getPool } from "./db.js";
import { loadPrincipalFromDb } from "./request-policy.js";

/** Resolve the dev "Act as" principal for IAM server actions. */
export const getRequestPrincipal = async (): Promise<Principal> => {
  const pool = getPool();
  const userId = await getActAsPrincipalId();
  return loadPrincipalFromDb(pool, userId);
};
