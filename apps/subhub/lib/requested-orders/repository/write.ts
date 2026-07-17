import { randomUUID } from "node:crypto";

import { ConflictError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { isUniqueViolation, tableExists } from "../../sites/repository/sql-utils";
import type {
  RequestedOrderDetailWriteRow,
  RequestedOrderLineItemPatchRow,
} from "../descriptors/requested-order-detail";
import {
  loadPurchaseOrderCoverageForJob,
  loadRequisitionedCoverageForJob,
} from "./remaining";

const toNumber = (value: unknown): number => Number(value ?? 0);

/** Statuses beyond app control once a purchase order has picked up the line (task 52 pin). */
const FROZEN_STATUSES = new Set(["on_purchase_order", "fulfilled"]);

export type PriorLineRow = {
  id: string;
  line_number: number;
  job_line_part_id: string | null;
  part_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  status: string;
  withdrawal_note: string;
};

const loadPriorLines = async (
  client: PoolClient,
  requestedOrderId: string,
): Promise<PriorLineRow[]> => {
  const result = await client.query<{
    id: string;
    line_number: number;
    job_line_part_id: string | null;
    part_id: string | null;
    description: string;
    quantity: string | number;
    unit: string;
    status: string;
    withdrawal_note: string;
  }>(
    `SELECT id, line_number, job_line_part_id, part_id, description, quantity, unit, status, withdrawal_note
     FROM requested_order_line
     WHERE requested_order_id = $1`,
    [requestedOrderId],
  );

  return result.rows.map((row) => ({ ...row, quantity: toNumber(row.quantity) }));
};

export const assertFreeformOrEngineered = (
  row: RequestedOrderLineItemPatchRow & { id: string },
): void => {
  if (row.job_line_part_id) {
    return;
  }

  const hasDescription = (row.description ?? "").trim().length > 0;
  const hasPart = Boolean(row.part_id);
  if (!hasDescription && !hasPart) {
    throw new ValidationError(
      "Ad-hoc lines require a description and/or a part",
      { field: "line_items", code: "missing_freeform_detail", id: row.id },
    );
  }
};

export const assertWithdrawalNote = (
  row: RequestedOrderLineItemPatchRow & { id: string },
): void => {
  if (row.status === "withdrawn" && !(row.withdrawal_note ?? "").trim()) {
    throw new ValidationError(
      "withdrawal_note is required when withdrawing a line",
      { field: "line_items", code: "withdrawal_note_required", id: row.id },
    );
  }
};

/** Edit while open; freeze once a line is on a purchase order or fulfilled (task 52 pin). */
export const assertNotFrozen = (
  prior: PriorLineRow | undefined,
  row: RequestedOrderLineItemPatchRow & { id: string },
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
    (row.withdrawal_note !== undefined &&
      row.withdrawal_note !== prior.withdrawal_note);

  if (changed) {
    throw new ConflictError(
      `Cannot edit line ${prior.id}: status ${prior.status} is frozen`,
      { field: "line_items", code: "line_frozen", id: prior.id, status: prior.status },
    );
  }
};

export const assertFrozenLinesNotRemoved = (
  prior: PriorLineRow[],
  incomingIds: Set<string>,
): void => {
  for (const line of prior) {
    if (FROZEN_STATUSES.has(line.status) && !incomingIds.has(line.id)) {
      throw new ConflictError(
        `Cannot remove line ${line.id}: status ${line.status} is frozen`,
        { field: "line_items", code: "line_frozen", id: line.id, status: line.status },
      );
    }
  }
};

/**
 * Cap qty <= job-wide remaining (task 52 R3/R4). Computed per `job_line_part_id`
 * across the whole incoming payload, netting out this header's own prior
 * (pre-edit) contribution so edits to an existing pick don't self-block.
 */
export const assertWithinRemaining = async (
  client: PoolClient,
  jobId: string,
  prior: PriorLineRow[],
  normalized: Array<RequestedOrderLineItemPatchRow & { id: string }>,
): Promise<void> => {
  const incomingSums = new Map<string, number>();
  for (const row of normalized) {
    if (row.job_line_part_id && row.status !== "withdrawn") {
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
    if (line.job_line_part_id && line.status !== "withdrawn") {
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
        field: "line_items",
        code: "unknown_job_line_part",
        job_line_part_id: partId,
      });
    }

    const otherHeadersCovered =
      (jobWideCoverage.get(partId) ?? 0) - (ownCoverage.get(partId) ?? 0);
    const poCovered = poCoverage.get(partId) ?? 0;
    const allowed = Math.max(0, demand - otherHeadersCovered - poCovered);

    if (incomingQty > allowed + 1e-9) {
      throw new ValidationError(
        "Quantity exceeds job-wide remaining need for this part",
        {
          field: "line_items",
          code: "over_remaining",
          job_line_part_id: partId,
          remaining: allowed,
          requested: incomingQty,
        },
      );
    }
  }
};

export const replaceRequestedOrderLineItemsTx = async (
  client: PoolClient,
  jobId: string,
  requestedOrderId: string,
  rows: RequestedOrderLineItemPatchRow[],
): Promise<void> => {
  const prior = await loadPriorLines(client, requestedOrderId);
  const priorById = new Map(prior.map((row) => [row.id, row]));

  const normalized = rows.map((row) => ({ ...row, id: row.id ?? randomUUID() }));
  const incomingIds = new Set(normalized.map((row) => row.id));

  assertFrozenLinesNotRemoved(prior, incomingIds);

  for (const row of normalized) {
    assertFreeformOrEngineered(row);
    assertWithdrawalNote(row);
    assertNotFrozen(priorById.get(row.id), row);
  }

  await assertWithinRemaining(client, jobId, prior, normalized);

  const toDelete = prior
    .map((row) => row.id)
    .filter((id) => !incomingIds.has(id));
  if (toDelete.length > 0) {
    await client.query(`DELETE FROM requested_order_line WHERE id = ANY($1::text[])`, [
      toDelete,
    ]);
  }

  let nextLineNumber =
    prior.reduce((max, row) => Math.max(max, row.line_number), 0) + 1;

  for (const [index, row] of normalized.entries()) {
    const existing = priorById.get(row.id);
    const status = row.status ?? existing?.status ?? "open";
    const description = row.description ?? existing?.description ?? "";
    const unit = row.unit ?? existing?.unit ?? "ea";
    const withdrawalNote = row.withdrawal_note ?? existing?.withdrawal_note ?? "";
    const jobLinePartId = row.job_line_part_id ?? existing?.job_line_part_id ?? null;
    const partId = row.part_id ?? existing?.part_id ?? null;

    if (existing) {
      await client.query(
        `UPDATE requested_order_line
         SET job_line_part_id = $2,
             part_id = $3,
             description = $4,
             quantity = $5,
             unit = $6,
             status = $7,
             withdrawal_note = $8,
             sort_order = $9
         WHERE id = $1`,
        [
          row.id,
          jobLinePartId,
          partId,
          description,
          row.quantity,
          unit,
          status,
          withdrawalNote,
          index,
        ],
      );
    } else {
      const lineNumber = nextLineNumber;
      nextLineNumber += 1;
      await client.query(
        `INSERT INTO requested_order_line (
           id, requested_order_id, line_number, job_line_part_id, part_id,
           description, quantity, unit, status, withdrawal_note, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          row.id,
          requestedOrderId,
          lineNumber,
          jobLinePartId,
          partId,
          description,
          row.quantity,
          unit,
          status,
          withdrawalNote,
          index,
        ],
      );
    }
  }
};

export const replaceRequestedOrderLineItems = async (
  pool: Pool,
  actorId: string,
  jobId: string,
  requestedOrderId: string,
  rows: RequestedOrderLineItemPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceRequestedOrderLineItemsTx(client, jobId, requestedOrderId, rows);
  });
};

const assertJobExists = async (client: Pool | PoolClient, jobId: string): Promise<void> => {
  const result = await client.query<{ id: string }>(`SELECT id FROM job WHERE id = $1`, [
    jobId,
  ]);
  if (result.rows.length === 0) {
    throw new ValidationError("Invalid job_id", { field: "profile", code: "unknown_job" });
  }
};

export const insertRequestedOrder = async (
  pool: Pool,
  actorId: string,
  row: RequestedOrderDetailWriteRow,
  requestedBy: string | null,
  related?: { line_items?: RequestedOrderLineItemPatchRow[] },
): Promise<void> => {
  try {
    await withPermissionDb(pool, actorId, async (client) => {
      await assertJobExists(client, row.job_id);

      await client.query(
        `INSERT INTO requested_order (id, job_id, requested_by, note)
         VALUES ($1, $2, $3, $4)`,
        [row.id, row.job_id, requestedBy, row.note],
      );

      if (related?.line_items !== undefined) {
        await replaceRequestedOrderLineItemsTx(client, row.job_id, row.id, related.line_items);
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Requisition already exists");
    }
    throw error;
  }
};

export const updateRequestedOrder = async (
  pool: Pool,
  actorId: string,
  row: RequestedOrderDetailWriteRow,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(
      `UPDATE requested_order
       SET note = $2, updated_at = now()
       WHERE id = $1 AND job_id = $3`,
      [row.id, row.note, row.job_id],
    );
  });
};

/** Delete guard — every line must be `open`/`withdrawn` (or no lines) — task 52 pin. */
export const loadRequestedOrderDeleteBlockers = async (
  pool: Pool,
  requestedOrderId: string,
): Promise<Array<{ status: string; count: number }>> => {
  if (!(await tableExists(pool, "requested_order_line"))) {
    return [];
  }

  const result = await pool.query<{ status: string; count: number }>(
    `SELECT status, COUNT(*)::int AS count
     FROM requested_order_line
     WHERE requested_order_id = $1
       AND status IN ('on_purchase_order', 'fulfilled')
     GROUP BY status`,
    [requestedOrderId],
  );

  return result.rows;
};

export const deleteRequestedOrder = async (
  pool: Pool,
  actorId: string,
  id: string,
): Promise<void> => {
  const blockers = await loadRequestedOrderDeleteBlockers(pool, id);
  if (blockers.length > 0) {
    throw new ConflictError(
      "Cannot delete requisition: one or more lines are on a purchase order or fulfilled",
      { field: "profile", code: "line_frozen", blockers },
    );
  }

  await withPermissionDb(pool, actorId, async (client) => {
    await client.query(`DELETE FROM requested_order WHERE id = $1`, [id]);
  });
};
