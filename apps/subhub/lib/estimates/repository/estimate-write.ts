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
  EstimateDetailRow,
  EstimateDetailWriteRow,
} from "../descriptors/estimate-detail";
import {
  collectConditionIdsFromPatch,
  loadEstimateConditionIds,
  replaceEstimateConditionsTx,
} from "./estimate-conditions-write";
import { replaceEstimateLineItemsTx } from "./estimate-lines-write";
import { replaceEstimateStakeholdersTx } from "./estimate-stakeholders";

/** Statuses where profile.site_id must not change (S8). */
const SITE_FROZEN_STATUSES = new Set(["won", "lost", "expired"]);

export const assertSiteIdChangeAllowed = (
  existing: Pick<EstimateDetailRow, "site_id" | "status">,
  nextSiteId: string,
): void => {
  if (nextSiteId === existing.site_id) {
    return;
  }

  if (SITE_FROZEN_STATUSES.has(existing.status)) {
    throw new ConflictError("Cannot change site_id on a frozen estimate", {
      field: "profile",
      code: "site_id_frozen",
    });
  }
};

/**
 * When site_id changes, body must include empty `conditions` + `line_items`
 * (client warn-and-clear). Reject non-empty collections or omit-while-DB-has-structure.
 */
export const assertSiteChangeClearsStructure = ({
  existingSiteId,
  nextSiteId,
  status,
  body,
  existingConditionCount,
  existingLineCount,
}: {
  existingSiteId: string;
  nextSiteId: string | undefined;
  status: string;
  body: unknown;
  existingConditionCount: number;
  existingLineCount: number;
}): void => {
  if (nextSiteId === undefined || nextSiteId === existingSiteId) {
    return;
  }

  assertSiteIdChangeAllowed({ site_id: existingSiteId, status }, nextSiteId);

  const patch =
    typeof body === "object" && body !== null
      ? (body as { conditions?: unknown; line_items?: unknown })
      : {};

  const conditions = patch.conditions;
  const lineItems = patch.line_items;

  if (Array.isArray(conditions) && conditions.length > 0) {
    throw new ConflictError(
      "Changing site_id requires empty conditions and line_items in the same request",
      {
        field: "profile",
        code: "site_change_requires_clear",
      },
    );
  }

  if (Array.isArray(lineItems) && lineItems.length > 0) {
    throw new ConflictError(
      "Changing site_id requires empty conditions and line_items in the same request",
      {
        field: "profile",
        code: "site_change_requires_clear",
      },
    );
  }

  const hasExistingStructure =
    existingConditionCount > 0 || existingLineCount > 0;

  if (
    hasExistingStructure &&
    (conditions === undefined || lineItems === undefined)
  ) {
    throw new ConflictError(
      "Changing site_id requires empty conditions and line_items in the same request",
      {
        field: "profile",
        code: "site_change_requires_clear",
      },
    );
  }
};

export const countEstimateStructure = async (
  client: Pool | PoolClient,
  estimateId: string,
): Promise<{ conditionCount: number; lineCount: number }> => {
  const result = await client.query<{
    condition_count: number;
    line_count: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM estimate_condition WHERE estimate_id = $1) AS condition_count,
       (SELECT COUNT(*)::int FROM estimate_line WHERE estimate_id = $1) AS line_count`,
    [estimateId],
  );

  return {
    conditionCount: result.rows[0]?.condition_count ?? 0,
    lineCount: result.rows[0]?.line_count ?? 0,
  };
};

export const assertSiteExists = async (
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
  existing?: Pick<EstimateDetailRow, "site_id" | "status">,
): Promise<void> => {
  if (existing !== undefined) {
    assertSiteIdChangeAllowed(existing, row.site_id);
  }

  await assertSiteExists(client, row.site_id);

  if (row.source_estimate_id !== null) {
    await assertSourceEstimateExists(client, row.source_estimate_id, row.id);
  }
};

export const replaceEstimateCollectionsTx = async (
  client: PoolClient,
  estimateId: string,
  siteId: string,
  related: Pick<EstimateDetailRelatedPatch, "conditions" | "line_items">,
): Promise<void> => {
  if (
    related.line_items !== undefined &&
    related.line_items.length > 0 &&
    related.conditions !== undefined &&
    related.conditions.length === 0
  ) {
    throw new ValidationError(
      "At least one condition is required when line_items are present",
      {
        field: "conditions",
        code: "condition_required",
      },
    );
  }

  let validConditionIds: Set<string>;

  if (related.conditions !== undefined) {
    validConditionIds = await replaceEstimateConditionsTx(
      client,
      estimateId,
      related.conditions,
      related.line_items,
    );
  } else {
    validConditionIds = await loadEstimateConditionIds(client, estimateId);
  }

  if (related.line_items !== undefined) {
    await replaceEstimateLineItemsTx(
      client,
      estimateId,
      siteId,
      related.line_items,
      related.conditions !== undefined
        ? collectConditionIdsFromPatch(related.conditions)
        : validConditionIds,
    );
  }
};

export const replaceEstimateCollections = async (
  pool: Pool,
  actorId: string,
  estimateId: string,
  siteId: string,
  related: Pick<EstimateDetailRelatedPatch, "conditions" | "line_items">,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceEstimateCollectionsTx(client, estimateId, siteId, related);
  });
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
           item_id
         )
         VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7)`,
        [
          row.id,
          row.title,
          row.site_id,
          row.estimate_date,
          row.valid_until,
          row.source_estimate_id,
          row.item_id,
        ],
      );

      if (related?.stakeholders !== undefined) {
        await replaceEstimateStakeholdersTx(client, row.id, related.stakeholders);
      }

      if (
        related?.conditions !== undefined ||
        related?.line_items !== undefined
      ) {
        await replaceEstimateCollectionsTx(client, row.id, row.site_id, {
          conditions: related.conditions,
          line_items: related.line_items,
        });
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
  existing: Pick<EstimateDetailRow, "site_id" | "status">,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await validateEstimateWriteRow(client, row, existing);
    await client.query(
      `UPDATE estimate
       SET title = $2,
           site_id = $3,
           estimate_date = $4,
           valid_until = $5,
           source_estimate_id = $6,
           item_id = $7,
           updated_at = now()
       WHERE id = $1`,
      [
        row.id,
        row.title,
        row.site_id,
        row.estimate_date,
        row.valid_until,
        row.source_estimate_id,
        row.item_id,
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
