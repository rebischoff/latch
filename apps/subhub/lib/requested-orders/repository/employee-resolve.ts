import type { Pool, PoolClient } from "pg";

/**
 * Resolve the current principal to an `employee.party_id` (task 52 pin —
 * `requested_by` from current employee when resolvable, else `null`).
 * `party_person.latch_user_id` links a logged-in user to its `party`; the
 * `employee` extension row (keyed by `party_id`) confirms the party is staff.
 */
export const resolveEmployeePartyIdForPrincipal = async (
  client: Pool | PoolClient,
  principalId: string,
): Promise<string | null> => {
  const result = await client.query<{ party_id: string }>(
    `SELECT e.party_id
     FROM party_person pp
     INNER JOIN employee e ON e.party_id = pp.party_id
     WHERE pp.latch_user_id = $1`,
    [principalId],
  );

  return result.rows[0]?.party_id ?? null;
};
