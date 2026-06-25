import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { isUniqueViolation } from "../../sites/repository/sql-utils";
import type {
  JobStakeholderPatchRow,
  JobStakeholderRow,
} from "../descriptors/job-detail";

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

const assertNoDuplicateStakeholders = (rows: JobStakeholderPatchRow[]): void => {
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

export const replaceJobStakeholdersTx = async (
  client: PoolClient,
  jobId: string,
  rows: JobStakeholderPatchRow[],
): Promise<void> => {
  assertNoDuplicateStakeholders(rows);

  for (const row of rows) {
    await assertPartyExists(client, row.party_id);
    await assertRelationExists(client, row.relation_id);
  }

  await client.query(`DELETE FROM job_party WHERE job_id = $1`, [jobId]);

  for (const [index, row] of rows.entries()) {
    try {
      await client.query(
        `INSERT INTO job_party (job_id, party_id, relation_id, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [jobId, row.party_id, row.relation_id, index],
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

export const replaceJobStakeholders = async (
  pool: Pool,
  actorId: string,
  jobId: string,
  rows: JobStakeholderPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceJobStakeholdersTx(client, jobId, rows);
  });
};

export const loadJobStakeholders = async (
  pool: Pool,
  jobId: string,
): Promise<JobStakeholderRow[]> => {
  const result = await pool.query<JobStakeholderRow>(
    `SELECT
       jp.party_id,
       p.display_name,
       p.kind,
       jp.relation_id,
       jpr.display_name AS relation_label,
       jp.sort_order
     FROM job_party jp
     INNER JOIN party p ON p.id = jp.party_id
     INNER JOIN job_party_relation jpr ON jpr.id = jp.relation_id
     WHERE jp.job_id = $1
     ORDER BY jp.sort_order ASC, p.display_name ASC, jp.party_id ASC`,
    [jobId],
  );

  return result.rows;
};
