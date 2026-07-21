import { ConflictError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { isUniqueViolation } from "../../sites/repository/sql-utils";
import {
  loadPurchaseOrderCoverageForJob,
  loadRequisitionedCoverageForJob,
} from "./remaining";

const toNumber = (value: unknown): number => Number(value ?? 0);

/** Statuses beyond app control once a purchase order has picked up the request (task 56). */
const FROZEN_STATUSES = new Set(["on_purchase_order", "fulfilled"]);

export type JobMaterialRequestStatus = "open" | "on_purchase_order" | "fulfilled";

export type JobMaterialRequestWriteInput = {
  id: string;
  job_id: string;
  site_zone_id?: string | null;
  job_line_part_id?: string | null;
  /** Catalog snapshot from job_line.item_id at Field ☐ Order (task 59 IT1) — not user-editable. */
  item_id?: string | null;
  part_id?: string | null;
  description?: string;
  quantity: number;
  unit?: string;
  status?: JobMaterialRequestStatus;
  requested_by?: string | null;
};

export type PriorRequestRow = {
  id: string;
  job_id: string;
  site_zone_id: string | null;
  job_line_part_id: string | null;
  item_id: string | null;
  part_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  status: string;
};

export const assertFreeformOrEngineered = (
  row: Pick<JobMaterialRequestWriteInput, "id" | "job_line_part_id" | "part_id" | "description">,
): void => {
  if (row.job_line_part_id) {
    return;
  }

  const hasDescription = (row.description ?? "").trim().length > 0;
  const hasPart = Boolean(row.part_id);
  if (!hasDescription && !hasPart) {
    throw new ValidationError(
      "Ad-hoc requests require a description and/or a part",
      { field: "profile", code: "missing_freeform_detail", id: row.id },
    );
  }
};

/** Edit while open; freeze once on a purchase order or fulfilled (task 56 RQ2). */
export const assertNotFrozen = (
  prior: PriorRequestRow | undefined,
  row: JobMaterialRequestWriteInput,
): void => {
  if (!prior || !FROZEN_STATUSES.has(prior.status)) {
    return;
  }

  const changed =
    (row.job_line_part_id !== undefined &&
      (row.job_line_part_id ?? null) !== prior.job_line_part_id) ||
    (row.part_id !== undefined && (row.part_id ?? null) !== prior.part_id) ||
    (row.description !== undefined && row.description !== prior.description) ||
    row.quantity !== prior.quantity ||
    (row.unit !== undefined && row.unit !== prior.unit) ||
    (row.status !== undefined && row.status !== prior.status) ||
    (row.site_zone_id !== undefined &&
      (row.site_zone_id ?? null) !== prior.site_zone_id);

  if (changed) {
    throw new ConflictError(
      `Cannot edit request ${prior.id}: status ${prior.status} is frozen`,
      { field: "profile", code: "request_frozen", id: prior.id, status: prior.status },
    );
  }
};

/**
 * Cap qty <= job-wide remaining (task 52 R3/R4 → 56). Computed per `job_line_part_id`
 * across the whole incoming payload, netting out prior rows' own contribution so
 * edits don't self-block.
 */
export const assertWithinRemaining = async (
  client: PoolClient,
  jobId: string,
  prior: PriorRequestRow[],
  normalized: JobMaterialRequestWriteInput[],
): Promise<void> => {
  const incomingSums = new Map<string, number>();
  for (const row of normalized) {
    if (row.job_line_part_id && (row.status ?? "open") !== "fulfilled") {
      incomingSums.set(
        row.job_line_part_id,
        (incomingSums.get(row.job_line_part_id) ?? 0) + row.quantity,
      );
    }
  }

  if (incomingSums.size === 0) {
    return;
  }

  const ownCoverage = new Map<string, number>();
  for (const line of prior) {
    if (line.job_line_part_id) {
      ownCoverage.set(
        line.job_line_part_id,
        (ownCoverage.get(line.job_line_part_id) ?? 0) + line.quantity,
      );
    }
  }

  const partIds = [...incomingSums.keys()];
  const demandResult = await client.query<{ id: string; quantity: string | number }>(
    `SELECT jlp.id, jlp.quantity
     FROM job_line_part jlp
     INNER JOIN job_line jl ON jl.id = jlp.job_line_id
     WHERE jlp.id = ANY($1::text[]) AND jl.job_id = $2`,
    [partIds, jobId],
  );
  const demandMap = new Map(
    demandResult.rows.map((row) => [row.id, toNumber(row.quantity)] as const),
  );

  const [jobWideCoverage, poCoverage] = await Promise.all([
    loadRequisitionedCoverageForJob(client, jobId),
    loadPurchaseOrderCoverageForJob(client, jobId),
  ]);

  for (const [partId, incomingQty] of incomingSums) {
    const demand = demandMap.get(partId);
    if (demand === undefined) {
      throw new ValidationError("job_line_part_id does not belong to this job", {
        field: "profile",
        code: "unknown_job_line_part",
        job_line_part_id: partId,
      });
    }

    const otherCovered =
      (jobWideCoverage.get(partId) ?? 0) - (ownCoverage.get(partId) ?? 0);
    const poCovered = poCoverage.get(partId) ?? 0;
    const allowed = Math.max(0, demand - otherCovered - poCovered);

    if (incomingQty > allowed + 1e-9) {
      throw new ValidationError(
        "Quantity exceeds job-wide remaining need for this part",
        {
          field: "profile",
          code: "over_remaining",
          job_line_part_id: partId,
          remaining: allowed,
          requested: incomingQty,
        },
      );
    }
  }
};

export const loadPriorRequest = async (
  client: PoolClient,
  id: string,
): Promise<PriorRequestRow | undefined> => {
  const result = await client.query<{
    id: string;
    job_id: string;
    site_zone_id: string | null;
    job_line_part_id: string | null;
    item_id: string | null;
    part_id: string | null;
    description: string;
    quantity: string | number;
    unit: string;
    status: string;
  }>(
    `SELECT id, job_id, site_zone_id, job_line_part_id, item_id, part_id, description, quantity, unit, status
     FROM job_material_request
     WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) {
    return undefined;
  }
  return { ...row, quantity: toNumber(row.quantity) };
};

const assertJobExists = async (client: Pool | PoolClient, jobId: string): Promise<void> => {
  const result = await client.query<{ id: string }>(`SELECT id FROM job WHERE id = $1`, [
    jobId,
  ]);
  if (result.rows.length === 0) {
    throw new ValidationError("Invalid job_id", { field: "profile", code: "unknown_job" });
  }
};

export const insertJobMaterialRequestsTx = async (
  client: PoolClient,
  rows: JobMaterialRequestWriteInput[],
): Promise<void> => {
  if (rows.length === 0) {
    return;
  }

  const jobId = rows[0]!.job_id;
  for (const row of rows) {
    if (row.job_id !== jobId) {
      throw new ValidationError("All requests in a batch must share the same job_id", {
        field: "profile",
        code: "mixed_job",
      });
    }
    assertFreeformOrEngineered(row);
  }

  await assertJobExists(client, jobId);
  await assertWithinRemaining(client, jobId, [], rows);

  for (const row of rows) {
    await client.query(
      `INSERT INTO job_material_request (
         id, job_id, site_zone_id, job_line_part_id, item_id, part_id,
         description, quantity, unit, status, requested_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        row.id,
        row.job_id,
        row.site_zone_id ?? null,
        row.job_line_part_id ?? null,
        row.item_id ?? null,
        row.part_id ?? null,
        row.description ?? "",
        row.quantity,
        row.unit ?? "ea",
        row.status ?? "open",
        row.requested_by ?? null,
      ],
    );
  }
};

export const insertJobMaterialRequest = async (
  pool: Pool,
  actorId: string,
  row: JobMaterialRequestWriteInput,
): Promise<void> => {
  try {
    await withPermissionDb(pool, actorId, async (client) => {
      await insertJobMaterialRequestsTx(client, [row]);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Material request already exists");
    }
    throw error;
  }
};

export const updateJobMaterialRequest = async (
  pool: Pool,
  actorId: string,
  row: JobMaterialRequestWriteInput,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    const prior = await loadPriorRequest(client, row.id);
    if (!prior) {
      throw new ValidationError("Unknown material request", {
        field: "profile",
        code: "unknown_request",
        id: row.id,
      });
    }
    if (prior.job_id !== row.job_id) {
      throw new ValidationError("job_id is immutable", {
        field: "profile",
        code: "job_immutable",
      });
    }

    assertFreeformOrEngineered({
      id: row.id,
      job_line_part_id:
        row.job_line_part_id !== undefined
          ? row.job_line_part_id
          : prior.job_line_part_id,
      part_id: row.part_id !== undefined ? row.part_id : prior.part_id,
      description:
        row.description !== undefined ? row.description : prior.description,
    });
    assertNotFrozen(prior, row);
    await assertWithinRemaining(client, row.job_id, [prior], [row]);

    await client.query(
      `UPDATE job_material_request
       SET site_zone_id = $2,
           job_line_part_id = $3,
           part_id = $4,
           description = $5,
           quantity = $6,
           unit = $7,
           status = $8,
           updated_at = now()
       WHERE id = $1`,
      [
        row.id,
        row.site_zone_id !== undefined ? row.site_zone_id : prior.site_zone_id,
        row.job_line_part_id !== undefined
          ? row.job_line_part_id
          : prior.job_line_part_id,
        row.part_id !== undefined ? row.part_id : prior.part_id,
        row.description !== undefined ? row.description : prior.description,
        row.quantity,
        row.unit !== undefined ? row.unit : prior.unit,
        row.status !== undefined ? row.status : prior.status,
      ],
    );
  });
};

/** Hard-delete while open; reject when frozen (task 56 RQ2). */
export const deleteJobMaterialRequest = async (
  pool: Pool,
  actorId: string,
  id: string,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    const prior = await loadPriorRequest(client, id);
    if (!prior) {
      return;
    }
    if (FROZEN_STATUSES.has(prior.status)) {
      throw new ConflictError(
        `Cannot delete request ${id}: status ${prior.status} is frozen`,
        { field: "profile", code: "request_frozen", id, status: prior.status },
      );
    }
    await client.query(`DELETE FROM job_material_request WHERE id = $1`, [id]);
  });
};

/** Hard-delete open requests for a zone (Field ☐ Order uncheck). */
export const deleteOpenRequestsForZoneTx = async (
  client: PoolClient,
  jobId: string,
  siteZoneId: string | null,
): Promise<number> => {
  const result = await client.query(
    `DELETE FROM job_material_request
     WHERE job_id = $1
       AND status = 'open'
       AND (
         ($2::text IS NULL AND site_zone_id IS NULL)
         OR site_zone_id = $2
       )`,
    [jobId, siteZoneId],
  );
  return result.rowCount ?? 0;
};
