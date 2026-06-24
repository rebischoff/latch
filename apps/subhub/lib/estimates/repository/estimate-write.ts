import { ConflictError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import {
  isForeignKeyViolation,
  isUniqueViolation,
  tableExists,
} from "../../sites/repository/sql-utils";
import type {
  EstimateDetailRelatedPatch,
  EstimateDetailWriteRow,
} from "../descriptors/estimate-detail";
import { replaceEstimateLineItemsTx } from "./estimate-lines-write";
import { replaceEstimateStakeholdersTx } from "./estimate-stakeholders";

const assertSiteExists = async (
  client: Pool | PoolClient,
  siteId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM site WHERE id = $1`,
    [siteId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Invalid site_id", {
      field: "profile",
      code: "unknown_site",
    });
  }
};

const assertSourceEstimateExists = async (
  client: Pool | PoolClient,
  sourceEstimateId: string,
  excludeId?: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM estimate WHERE id = $1`,
    [sourceEstimateId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Invalid source_estimate_id", {
      field: "profile",
      code: "unknown_estimate",
    });
  }

  if (excludeId !== undefined && sourceEstimateId === excludeId) {
    throw new ValidationError("source_estimate_id cannot reference self", {
      field: "profile",
      code: "self_reference",
    });
  }
};

const validateEstimateWriteRow = async (
  client: Pool | PoolClient,
  row: EstimateDetailWriteRow,
): Promise<void> => {
  await assertSiteExists(client, row.site_id);

  if (row.source_estimate_id !== null) {
    await assertSourceEstimateExists(client, row.source_estimate_id, row.id);
  }
};

export const loadEstimateDeleteBlockers = async (
  pool: Pool,
  estimateId: string,
): Promise<Array<{ type: string; count: number }>> => {
  const blockers: Array<{ type: string; count: number }> = [];

  if (!(await tableExists(pool, "job"))) {
    return blockers;
  }

  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM job WHERE estimate_id = $1`,
    [estimateId],
  );
  const count = result.rows[0]?.count ?? 0;
  if (count > 0) {
    blockers.push({ type: "job", count });
  }

  return blockers;
};

export const insertEstimate = async (
  pool: Pool,
  actorId: string,
  row: EstimateDetailWriteRow,
  related?: EstimateDetailRelatedPatch,
): Promise<void> => {
  try {
    await withPermissionDb(pool, actorId, async (client) => {
      await validateEstimateWriteRow(client, row);
      await client.query(
        `INSERT INTO estimate (
           id,
           title,
           site_id,
           status,
           estimate_date,
           valid_until,
           source_estimate_id,
           category_id
         )
         VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7)`,
        [
          row.id,
          row.title,
          row.site_id,
          row.estimate_date,
          row.valid_until,
          row.source_estimate_id,
          row.category_id,
        ],
      );

      if (related?.stakeholders !== undefined) {
        await replaceEstimateStakeholdersTx(client, row.id, related.stakeholders);
      }

      if (related?.line_items !== undefined) {
        await replaceEstimateLineItemsTx(
          client,
          row.id,
          row.site_id,
          related.line_items,
        );
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Estimate already exists");
    }
    throw error;
  }
};

export const updateEstimate = async (
  pool: Pool,
  actorId: string,
  row: EstimateDetailWriteRow,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await validateEstimateWriteRow(client, row);
    await client.query(
      `UPDATE estimate
       SET title = $2,
           site_id = $3,
           estimate_date = $4,
           valid_until = $5,
           source_estimate_id = $6,
           category_id = $7,
           updated_at = now()
       WHERE id = $1`,
      [
        row.id,
        row.title,
        row.site_id,
        row.estimate_date,
        row.valid_until,
        row.source_estimate_id,
        row.category_id,
      ],
    );
  });
};

export const deleteEstimate = async (
  pool: Pool,
  actorId: string,
  id: string,
  status: string,
): Promise<void> => {
  if (status !== "draft") {
    if (status === "won") {
      const blockers = await loadEstimateDeleteBlockers(pool, id);
      if (blockers.some((blocker) => blocker.type === "job")) {
        throw new ConflictError("Cannot delete estimate: referenced by job");
      }
    }
    throw new ConflictError("Only draft estimates can be deleted");
  }

  try {
    await withPermissionDb(pool, actorId, async (client) => {
      await client.query(`DELETE FROM estimate WHERE id = $1`, [id]);
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      const blockers = await loadEstimateDeleteBlockers(pool, id);
      if (blockers.some((blocker) => blocker.type === "job")) {
        throw new ConflictError("Cannot delete estimate: referenced by job");
      }
    }
    throw error;
  }
};
