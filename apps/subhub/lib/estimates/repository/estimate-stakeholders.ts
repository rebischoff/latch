import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { isUniqueViolation } from "../../sites/repository/sql-utils";
import type {
  EstimateStakeholderPatchRow,
  EstimateStakeholderRow,
} from "../descriptors/estimate-detail";

const assertPartyExists = async (
  client: PoolClient,
  partyId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM party WHERE id = $1`,
    [partyId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Unknown party_id in stakeholders", {
      field: "stakeholders",
      code: "unknown_party",
    });
  }
};

const assertRelationExists = async (
  client: PoolClient,
  relationId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM job_party_relation WHERE id = $1`,
    [relationId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Unknown relation_id in stakeholders", {
      field: "stakeholders",
      code: "unknown_relation",
    });
  }
};

const assertNoDuplicateStakeholders = (rows: EstimateStakeholderPatchRow[]): void => {
  const seen = new Set<string>();

  for (const row of rows) {
    const key = `${row.party_id}:${row.relation_id}`;
    if (seen.has(key)) {
      throw new ValidationError("Duplicate stakeholder row", {
        field: "stakeholders",
        code: "duplicate",
        party_id: row.party_id,
        relation_id: row.relation_id,
      });
    }
    seen.add(key);
  }
};

export const replaceEstimateStakeholdersTx = async (
  client: PoolClient,
  estimateId: string,
  rows: EstimateStakeholderPatchRow[],
): Promise<void> => {
  assertNoDuplicateStakeholders(rows);

  for (const row of rows) {
    await assertPartyExists(client, row.party_id);
    await assertRelationExists(client, row.relation_id);
  }

  await client.query(`DELETE FROM estimate_party WHERE estimate_id = $1`, [
    estimateId,
  ]);

  for (const [index, row] of rows.entries()) {
    try {
      await client.query(
        `INSERT INTO estimate_party (estimate_id, party_id, relation_id, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [estimateId, row.party_id, row.relation_id, index],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ValidationError("Duplicate stakeholder row", {
          field: "stakeholders",
          code: "duplicate",
          party_id: row.party_id,
          relation_id: row.relation_id,
        });
      }
      throw error;
    }
  }
};

export const replaceEstimateStakeholders = async (
  pool: Pool,
  actorId: string,
  estimateId: string,
  rows: EstimateStakeholderPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceEstimateStakeholdersTx(client, estimateId, rows);
  });
};

export const loadEstimateStakeholders = async (
  pool: Pool,
  estimateId: string,
): Promise<EstimateStakeholderRow[]> => {
  const result = await pool.query<EstimateStakeholderRow>(
    `SELECT
       ep.party_id,
       p.display_name,
       p.kind,
       ep.relation_id,
       jpr.display_name AS relation_label,
       ep.sort_order
     FROM estimate_party ep
     INNER JOIN party p ON p.id = ep.party_id
     INNER JOIN job_party_relation jpr ON jpr.id = ep.relation_id
     WHERE ep.estimate_id = $1
     ORDER BY ep.sort_order ASC, p.display_name ASC, ep.party_id ASC`,
    [estimateId],
  );

  return result.rows;
};
