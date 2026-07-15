import { ConflictError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { tableExists } from "../../sites/repository/sql-utils";
import { seedScopePhasesForJobLineTx } from "./scope-phase-seed";

export type ChangeOrderLineAction = "add" | "deduct" | "revise";

export type BomCommitmentStatus = "open" | "on_purchase_order" | "received";

export type ChangeOrderApproveBlockedLine = {
  change_order_line_id: string;
  target_job_line_id: string;
  line_action: ChangeOrderLineAction;
  reason: "bom_committed";
  bom_statuses: BomCommitmentStatus[];
};

export type ChangeOrderApproveWarnedLine = {
  change_order_line_id: string;
  target_job_line_id: string;
  line_action: ChangeOrderLineAction;
  reason: "phase_progress";
  completed_qty_total: number;
};

export type ChangeOrderApprovePreview = {
  blocked: ChangeOrderApproveBlockedLine[];
  warned: ChangeOrderApproveWarnedLine[];
};

export type ScopePhaseSnapshot = {
  id: string;
  name: string;
  sequence: number;
  planned_qty: number;
  completed_qty: number;
};

/**
 * Carry completed_qty to replacement phases matched by name, then sequence (C6).
 * Scales proportionally when planned_qty changes; caps at new planned_qty.
 */
export const carryForwardCompletedQty = (
  oldPhases: ScopePhaseSnapshot[],
  newPhases: Array<Pick<ScopePhaseSnapshot, "id" | "name" | "sequence" | "planned_qty">>,
): Array<{ id: string; completed_qty: number }> => {
  const usedOld = new Set<string>();
  const updates: Array<{ id: string; completed_qty: number }> = [];

  for (const next of newPhases) {
    const byName = oldPhases.find(
      (old) => !usedOld.has(old.id) && old.name === next.name,
    );
    const bySeq =
      byName ??
      oldPhases.find((old) => !usedOld.has(old.id) && old.sequence === next.sequence);
    if (!bySeq) {
      continue;
    }
    usedOld.add(bySeq.id);

    let completed = bySeq.completed_qty;
    if (bySeq.planned_qty > 0 && next.planned_qty !== bySeq.planned_qty) {
      completed = (bySeq.completed_qty * next.planned_qty) / bySeq.planned_qty;
    }
    completed = Math.min(Math.max(0, completed), next.planned_qty);
    updates.push({ id: next.id, completed_qty: completed });
  }

  return updates;
};

export const hasCommittedBomStatus = (
  statuses: BomCommitmentStatus[],
): boolean =>
  statuses.some(
    (status) => status === "on_purchase_order" || status === "received",
  );

const toNumber = (value: unknown): number => Number(value ?? 0);

const loadBomStatusesForJobLine = async (
  client: PoolClient,
  jobLineId: string,
): Promise<BomCommitmentStatus[]> => {
  if (!(await tableExists(client, "job_line_part"))) {
    return [];
  }

  const parts = await client.query<{ id: string }>(
    `SELECT id FROM job_line_part WHERE job_line_id = $1`,
    [jobLineId],
  );

  if (parts.rows.length === 0) {
    return [];
  }

  const hasPo = await tableExists(client, "purchase_order_line");
  const hasReceipt = await tableExists(client, "material_receipt_line");

  const statuses: BomCommitmentStatus[] = [];
  for (const part of parts.rows) {
    let status: BomCommitmentStatus = "open";

    if (hasReceipt) {
      const received = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM material_receipt_line
         WHERE job_line_part_id = $1`,
        [part.id],
      );
      if ((received.rows[0]?.count ?? 0) > 0) {
        status = "received";
      }
    }

    if (status === "open" && hasPo) {
      const onPo = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM purchase_order_line
         WHERE job_line_part_id = $1`,
        [part.id],
      );
      if ((onPo.rows[0]?.count ?? 0) > 0) {
        status = "on_purchase_order";
      }
    }

    statuses.push(status);
  }

  return statuses;
};

const loadPhaseCompletedTotal = async (
  client: PoolClient,
  jobLineId: string,
): Promise<number> => {
  if (!(await tableExists(client, "scope_phase"))) {
    return 0;
  }

  const result = await client.query<{ total: string | number }>(
    `SELECT COALESCE(SUM(completed_qty), 0) AS total
     FROM scope_phase
     WHERE job_line_id = $1`,
    [jobLineId],
  );
  return toNumber(result.rows[0]?.total);
};

type CoLineRow = {
  id: string;
  line_action: ChangeOrderLineAction;
  target_job_line_id: string | null;
  description: string;
  quantity: string | number;
  unit: string;
  unit_price: string | number;
  line_number: number;
  sort_order: number;
};

export const previewChangeOrderApproveTx = async (
  client: PoolClient,
  changeOrderId: string,
): Promise<ChangeOrderApprovePreview> => {
  const lines = await client.query<CoLineRow>(
    `SELECT id, line_action, target_job_line_id, description, quantity, unit,
            unit_price, line_number, sort_order
     FROM change_order_line
     WHERE change_order_id = $1
     ORDER BY sort_order ASC, line_number ASC`,
    [changeOrderId],
  );

  const blocked: ChangeOrderApproveBlockedLine[] = [];
  const warned: ChangeOrderApproveWarnedLine[] = [];

  for (const line of lines.rows) {
    if (line.line_action !== "deduct" && line.line_action !== "revise") {
      continue;
    }
    if (!line.target_job_line_id) {
      continue;
    }

    const bomStatuses = await loadBomStatusesForJobLine(
      client,
      line.target_job_line_id,
    );
    if (hasCommittedBomStatus(bomStatuses)) {
      blocked.push({
        change_order_line_id: line.id,
        target_job_line_id: line.target_job_line_id,
        line_action: line.line_action,
        reason: "bom_committed",
        bom_statuses: bomStatuses,
      });
    }

    const completedTotal = await loadPhaseCompletedTotal(
      client,
      line.target_job_line_id,
    );
    if (completedTotal > 0) {
      warned.push({
        change_order_line_id: line.id,
        target_job_line_id: line.target_job_line_id,
        line_action: line.line_action,
        reason: "phase_progress",
        completed_qty_total: completedTotal,
      });
    }
  }

  return { blocked, warned };
};

const nextJobLineNumber = async (
  client: PoolClient,
  jobId: string,
): Promise<number> => {
  const result = await client.query<{ max: number | null }>(
    `SELECT MAX(line_number)::int AS max FROM job_line WHERE job_id = $1`,
    [jobId],
  );
  return (result.rows[0]?.max ?? 0) + 1;
};

const seedBomFromSoldLineTx = async (
  client: PoolClient,
  jobLineId: string,
): Promise<void> => {
  if (!(await tableExists(client, "job_line_part"))) {
    return;
  }

  const existing = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM job_line_part WHERE job_line_id = $1`,
    [jobLineId],
  );
  if ((existing.rows[0]?.count ?? 0) > 0) {
    return;
  }

  const line = await client.query<{
    part_id: string | null;
    vendor_part_id: string | null;
    description: string;
    quantity: string | number;
    unit: string;
    unit_cost: string | number;
  }>(
    `SELECT part_id, vendor_part_id, description, quantity, unit, unit_cost
     FROM job_line WHERE id = $1`,
    [jobLineId],
  );
  const sold = line.rows[0];
  if (!sold?.part_id) {
    return;
  }

  await client.query(
    `INSERT INTO job_line_part (
       job_line_id, part_id, vendor_part_id, description, quantity, unit, unit_cost, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
    [
      jobLineId,
      sold.part_id,
      sold.vendor_part_id,
      sold.description,
      sold.quantity,
      sold.unit,
      sold.unit_cost,
    ],
  );
};

const voidBomForJobLineTx = async (
  client: PoolClient,
  jobLineId: string,
): Promise<void> => {
  if (!(await tableExists(client, "job_line_part"))) {
    return;
  }
  await client.query(`DELETE FROM job_line_part WHERE job_line_id = $1`, [
    jobLineId,
  ]);
};

const loadScopePhases = async (
  client: PoolClient,
  jobLineId: string,
): Promise<ScopePhaseSnapshot[]> => {
  if (!(await tableExists(client, "scope_phase"))) {
    return [];
  }

  const result = await client.query<{
    id: string;
    name: string;
    sequence: number;
    planned_qty: string | number;
    completed_qty: string | number;
  }>(
    `SELECT id, name, sequence, planned_qty, completed_qty
     FROM scope_phase
     WHERE job_line_id = $1
     ORDER BY sequence ASC, sort_order ASC`,
    [jobLineId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    sequence: row.sequence,
    planned_qty: toNumber(row.planned_qty),
    completed_qty: toNumber(row.completed_qty),
  }));
};

const seedPhasesForReplacementTx = async (
  client: PoolClient,
  args: {
    jobLineId: string;
    itemId: string | null;
    estimateLineId: string | null;
    quantity: number;
    oldPhases: ScopePhaseSnapshot[];
  },
): Promise<void> => {
  if (!(await tableExists(client, "scope_phase"))) {
    return;
  }

  if (args.itemId && args.estimateLineId) {
    const estimateLine = await client.query<{
      estimate_condition_id: string | null;
    }>(
      `SELECT estimate_condition_id FROM estimate_line WHERE id = $1`,
      [args.estimateLineId],
    );
    const conditionId = estimateLine.rows[0]?.estimate_condition_id ?? null;
    await seedScopePhasesForJobLineTx(client, {
      job_line_id: args.jobLineId,
      item_id: args.itemId,
      estimate_condition_id: conditionId,
      site_zone_id: null,
      quantity: args.quantity,
    });
  }

  // If seed produced nothing but old phases exist, clone structure under the new line.
  let newPhases = await loadScopePhases(client, args.jobLineId);
  if (newPhases.length === 0 && args.oldPhases.length > 0) {
    for (const [index, old] of args.oldPhases.entries()) {
      const id = crypto.randomUUID();
      await client.query(
        `INSERT INTO scope_phase (
           id, job_line_id, name, sequence, planned_qty, completed_qty, sort_order
         ) VALUES ($1, $2, $3, $4, $5, 0, $6)`,
        [
          id,
          args.jobLineId,
          old.name,
          old.sequence,
          args.quantity,
          index + 1,
        ],
      );
    }
    newPhases = await loadScopePhases(client, args.jobLineId);
  }

  const updates = carryForwardCompletedQty(args.oldPhases, newPhases);
  for (const update of updates) {
    await client.query(
      `UPDATE scope_phase SET completed_qty = $1 WHERE id = $2`,
      [update.completed_qty, update.id],
    );
  }
};

const insertJobLineFromCoAdd = async (
  client: PoolClient,
  jobId: string,
  coLine: CoLineRow,
): Promise<string> => {
  const id = crypto.randomUUID();
  const lineNumber = await nextJobLineNumber(client, jobId);
  await client.query(
    `INSERT INTO job_line (
       id, job_id, line_number, line_role, line_kind, description, quantity, unit,
       unit_cost, unit_price, change_order_line_id, source, status, sort_order
     ) VALUES (
       $1, $2, $3, 'standalone', 'product', $4, $5, $6, $7, $8, $9, 'change_order', 'active', $10
     )`,
    [
      id,
      jobId,
      lineNumber,
      coLine.description,
      coLine.quantity,
      coLine.unit,
      0,
      coLine.unit_price,
      coLine.id,
      coLine.sort_order || lineNumber,
    ],
  );
  await seedBomFromSoldLineTx(client, id);
  return id;
};

const voidJobLineTx = async (
  client: PoolClient,
  jobLineId: string,
  changeOrderLineId: string,
): Promise<void> => {
  await client.query(
    `UPDATE job_line
     SET status = 'voided', change_order_line_id = COALESCE(change_order_line_id, $2)
     WHERE id = $1`,
    [jobLineId, changeOrderLineId],
  );
  await voidBomForJobLineTx(client, jobLineId);
  // scope_phase rows stay — parent voided removes them from active rollups; progress audit preserved (C5).
};

const reviseJobLineTx = async (
  client: PoolClient,
  jobId: string,
  coLine: CoLineRow,
  targetJobLineId: string,
): Promise<string> => {
  const target = await client.query<{
    id: string;
    item_id: string | null;
    part_id: string | null;
    vendor_part_id: string | null;
    estimate_line_id: string | null;
    site_zone_id: string | null;
    site_asset_id: string | null;
    line_role: string;
    line_kind: string;
    unit_cost: string | number;
  }>(
    `SELECT id, item_id, part_id, vendor_part_id, estimate_line_id,
            site_zone_id, site_asset_id, line_role, line_kind, unit_cost
     FROM job_line WHERE id = $1 FOR UPDATE`,
    [targetJobLineId],
  );
  const sold = target.rows[0];
  if (!sold) {
    throw new ValidationError("Unknown target_job_line_id", {
      field: "change_order_line",
      code: "unknown_target_job_line",
      target_job_line_id: targetJobLineId,
    });
  }

  const oldPhases = await loadScopePhases(client, targetJobLineId);
  await voidJobLineTx(client, targetJobLineId, coLine.id);

  const replacementId = crypto.randomUUID();
  const lineNumber = await nextJobLineNumber(client, jobId);
  await client.query(
    `INSERT INTO job_line (
       id, job_id, line_number, line_role, line_kind, description, quantity, unit,
       unit_cost, unit_price, site_zone_id, site_asset_id, item_id, part_id,
       vendor_part_id, estimate_line_id, change_order_line_id, source, status, sort_order
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
       'change_order', 'active', $18
     )`,
    [
      replacementId,
      jobId,
      lineNumber,
      sold.line_role,
      sold.line_kind,
      coLine.description,
      coLine.quantity,
      coLine.unit,
      sold.unit_cost,
      coLine.unit_price,
      sold.site_zone_id,
      sold.site_asset_id,
      sold.item_id,
      sold.part_id,
      sold.vendor_part_id,
      sold.estimate_line_id,
      coLine.id,
      coLine.sort_order || lineNumber,
    ],
  );

  await client.query(
    `UPDATE job_line SET status = 'superseded', superseded_by_job_line_id = $2 WHERE id = $1`,
    [targetJobLineId, replacementId],
  );

  await seedBomFromSoldLineTx(client, replacementId);
  await seedPhasesForReplacementTx(client, {
    jobLineId: replacementId,
    itemId: sold.item_id,
    estimateLineId: sold.estimate_line_id,
    quantity: toNumber(coLine.quantity),
    oldPhases,
  });

  return replacementId;
};

/**
 * Approve a draft change order — applies C4–C6 reconciliation.
 * Blocks with structured conflict when BOM is committed (C5).
 */
export const approveChangeOrderTx = async (
  client: PoolClient,
  changeOrderId: string,
): Promise<{
  job_id: string;
  preview: ChangeOrderApprovePreview;
}> => {
  const header = await client.query<{
    id: string;
    job_id: string;
    status: string;
  }>(
    `SELECT id, job_id, status FROM change_order WHERE id = $1 FOR UPDATE`,
    [changeOrderId],
  );
  const co = header.rows[0];
  if (!co) {
    throw new ValidationError("Unknown change order", {
      field: "change_order",
      code: "unknown_change_order",
    });
  }
  if (co.status !== "draft") {
    throw new ConflictError("Change order is not draft", {
      field: "change_order",
      code: "change_order_not_draft",
      status: co.status,
    });
  }

  const preview = await previewChangeOrderApproveTx(client, changeOrderId);
  if (preview.blocked.length > 0) {
    throw new ConflictError(
      "Cannot approve change order: BOM already committed on one or more lines",
      {
        field: "change_order",
        code: "bom_committed",
        blocked: preview.blocked,
        warned: preview.warned,
      },
    );
  }

  const lines = await client.query<CoLineRow>(
    `SELECT id, line_action, target_job_line_id, description, quantity, unit,
            unit_price, line_number, sort_order
     FROM change_order_line
     WHERE change_order_id = $1
     ORDER BY sort_order ASC, line_number ASC`,
    [changeOrderId],
  );

  for (const line of lines.rows) {
    if (line.line_action === "add") {
      await insertJobLineFromCoAdd(client, co.job_id, line);
      continue;
    }

    if (!line.target_job_line_id) {
      throw new ValidationError(
        `${line.line_action} requires target_job_line_id`,
        {
          field: "change_order_line",
          code: "missing_target_job_line",
          change_order_line_id: line.id,
        },
      );
    }

    if (line.line_action === "deduct") {
      await voidJobLineTx(client, line.target_job_line_id, line.id);
      continue;
    }

    if (line.line_action === "revise") {
      await reviseJobLineTx(client, co.job_id, line, line.target_job_line_id);
    }
  }

  await client.query(
    `UPDATE change_order SET status = 'approved', updated_at = now() WHERE id = $1`,
    [changeOrderId],
  );

  return { job_id: co.job_id, preview };
};

export const approveChangeOrder = async (
  pool: Pool,
  actorId: string,
  changeOrderId: string,
): Promise<{ job_id: string; preview: ChangeOrderApprovePreview }> =>
  withPermissionDb(pool, actorId, (client) =>
    approveChangeOrderTx(client, changeOrderId),
  );

export const previewChangeOrderApprove = async (
  pool: Pool,
  actorId: string,
  changeOrderId: string,
): Promise<ChangeOrderApprovePreview> =>
  withPermissionDb(pool, actorId, (client) =>
    previewChangeOrderApproveTx(client, changeOrderId),
  );
