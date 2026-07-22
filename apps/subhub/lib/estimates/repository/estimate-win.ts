import { ConflictError, NotFoundError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { seedBomFromSoldLineTx } from "../../jobs/repository/job-line-bom-seed";
import { seedScopePhasesForJobLineTx } from "../../jobs/repository/scope-phase-seed";
import {
  recalcLineItems,
  type RecalcLineInput,
} from "./estimate-line-recalc";

/** Estimate lifecycle statuses (ST1). */
export const ESTIMATE_STATUSES = [
  "draft",
  "submitted",
  "accepted",
  "rejected",
] as const;

export type EstimateLifecycleStatus = (typeof ESTIMATE_STATUSES)[number];

/** Non-draft statuses — quote inputs and preview/recalc are frozen (ST7–ST9). */
export const ESTIMATE_FROZEN_STATUSES = new Set<string>([
  "submitted",
  "accepted",
  "rejected",
]);

export const isEstimateFrozenStatus = (status: string): boolean =>
  ESTIMATE_FROZEN_STATUSES.has(status);

/** Job statuses considered "active" on a site for the W1c second-estimate gate. */
export const ACTIVE_JOB_STATUSES = ["planned", "active"] as const;

export type AcceptEstimateOptions = {
  /**
   * W1c: when the site already has an active job and this is false, `acceptEstimate`
   * throws a structured `site_has_active_job` conflict so the UI can confirm and
   * retry with `true`.
   */
  proceedDespiteActiveSiteJobs?: boolean;
};

export type AcceptedJobSummary = {
  id: string;
  catalog_scope_item_id: string;
  title: string;
};

export type AcceptEstimateResult = {
  jobs: AcceptedJobSummary[];
};

type EstimateHeader = {
  id: string;
  site_id: string;
  title: string;
  status: string;
};

type EstimateLineRow = {
  id: string;
  estimate_condition_id: string;
  parent_line_id: string | null;
  line_role: string;
  description: string;
  quantity: string | number;
  qty_manual: boolean;
  unit: string;
  unit_cost: string | number;
  unit_price: string | number;
  unit_material: string | number;
  unit_labor: string | number;
  unit_freight: string | number;
  unit_incidental: string | number;
  unit_price_target: string | number | null;
  sales_locked: boolean;
  material_locked: boolean;
  item_id: string | null;
  part_id: string | null;
  vendor_part_id: string | null;
  site_asset_id: string | null;
  sort_order: number;
};

type EstimateConditionRow = {
  id: string;
  parent_condition_id: string | null;
  site_zone_id: string | null;
  name: string;
  complexity_factor_id: string | null;
  labor_phases_explicit: boolean;
  labor_only: boolean;
  labor_only_explicit: boolean;
  include_discontinued: boolean;
  include_discontinued_explicit: boolean;
  sort_order: number;
};

// ─── Pure helpers (unit-tested) ──────────────────────────────────────────────

export type PartitionableLine = {
  id: string;
  item_id: string | null;
};

/**
 * W1a: group line ids by catalog scope root (resolved from `item_id` via item
 * ancestry). Lines whose item has no resolvable scope are skipped by the caller
 * after validation.
 */
export const partitionLineIdsByCatalogScope = (
  lines: PartitionableLine[],
  scopeByItemId: Map<string, string>,
): Map<string, string[]> => {
  const byScope = new Map<string, string[]>();
  for (const line of lines) {
    if (!line.item_id) {
      continue;
    }
    const scope = scopeByItemId.get(line.item_id);
    if (!scope) {
      continue;
    }
    const list = byScope.get(scope) ?? [];
    list.push(line.id);
    byScope.set(scope, list);
  }
  return byScope;
};

/**
 * W1a: expand a slice's bound condition ids to include every ancestor up to the
 * root. A condition is copied into a job when a line in that slice binds to it
 * (or to one of its descendants).
 */
export const collectSliceConditionIds = (
  boundConditionIds: Iterable<string>,
  parentByConditionId: Map<string, string | null>,
): Set<string> => {
  const result = new Set<string>();
  for (const start of boundConditionIds) {
    let current: string | null | undefined = start;
    while (current) {
      if (result.has(current)) {
        break;
      }
      result.add(current);
      current = parentByConditionId.get(current) ?? null;
    }
  }
  return result;
};

/** Title prefill: estimate title joined with the catalog scope item name (W2). */
export const buildJobTitle = (
  estimateTitle: string,
  scopeItemName: string | null,
): string => {
  const base = estimateTitle.trim();
  const scope = scopeItemName?.trim();
  if (base && scope) {
    return `${base} — ${scope}`;
  }
  return base || scope || "";
};

/** Accept is only from `submitted` (ST8 / ST10). */
export const isAcceptableStatus = (status: string): boolean =>
  status === "submitted";

export const canSubmitEstimate = (status: string): boolean => status === "draft";

export const canRejectEstimate = (status: string): boolean =>
  status === "draft" || status === "submitted";

export const canRecallEstimate = (status: string): boolean =>
  status === "submitted";

// ─── Loaders ─────────────────────────────────────────────────────────────────

const loadEstimateHeaderForUpdate = async (
  client: PoolClient,
  estimateId: string,
): Promise<EstimateHeader> => {
  const result = await client.query<EstimateHeader>(
    `SELECT id, site_id, title, status
     FROM estimate WHERE id = $1 FOR UPDATE`,
    [estimateId],
  );
  const estimate = result.rows[0];
  if (!estimate) {
    throw new NotFoundError("Estimate not found");
  }
  return estimate;
};

const loadEstimateLines = async (
  client: PoolClient,
  estimateId: string,
): Promise<EstimateLineRow[]> => {
  const result = await client.query<EstimateLineRow>(
    `SELECT
       id, estimate_condition_id, parent_line_id, line_role, description,
       quantity, qty_manual, unit, unit_cost, unit_price, unit_material,
       unit_labor, unit_freight, unit_incidental, unit_price_target,
       sales_locked, material_locked, item_id, part_id, vendor_part_id,
       site_asset_id, sort_order
     FROM estimate_line
     WHERE estimate_id = $1
     ORDER BY sort_order ASC, line_number ASC, id ASC`,
    [estimateId],
  );
  return result.rows;
};

const loadEstimateConditions = async (
  client: PoolClient,
  estimateId: string,
): Promise<Map<string, EstimateConditionRow>> => {
  const result = await client.query<EstimateConditionRow>(
    `SELECT
       id, parent_condition_id, site_zone_id, name, complexity_factor_id,
       labor_phases_explicit, labor_only, labor_only_explicit,
       include_discontinued, include_discontinued_explicit, sort_order
     FROM estimate_condition
     WHERE estimate_id = $1`,
    [estimateId],
  );
  return new Map(result.rows.map((row) => [row.id, row]));
};

/** W1a catalog scope resolution: origin item_id → root item id (parent_id NULL). */
const resolveCatalogScopeByItemId = async (
  client: PoolClient,
  itemIds: string[],
): Promise<Map<string, string>> => {
  if (itemIds.length === 0) {
    return new Map();
  }

  const result = await client.query<{
    item_id: string;
    catalog_scope_item_id: string;
  }>(
    `WITH RECURSIVE ancestry AS (
       SELECT id, parent_id, id AS origin_id FROM item WHERE id = ANY($1::text[])
       UNION ALL
       SELECT i.id, i.parent_id, a.origin_id
       FROM item i JOIN ancestry a ON i.id = a.parent_id
     )
     SELECT origin_id AS item_id, id AS catalog_scope_item_id
     FROM ancestry WHERE parent_id IS NULL`,
    [itemIds],
  );

  return new Map(result.rows.map((row) => [row.item_id, row.catalog_scope_item_id]));
};

const loadItemNames = async (
  client: PoolClient,
  itemIds: string[],
): Promise<Map<string, string>> => {
  if (itemIds.length === 0) {
    return new Map();
  }
  const result = await client.query<{ id: string; name: string }>(
    `SELECT id, name FROM item WHERE id = ANY($1::text[])`,
    [itemIds],
  );
  return new Map(result.rows.map((row) => [row.id, row.name]));
};

const loadActiveSiteJobIds = async (
  client: PoolClient,
  siteId: string,
): Promise<string[]> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM job
     WHERE site_id = $1 AND status = ANY($2::text[])`,
    [siteId, [...ACTIVE_JOB_STATUSES]],
  );
  return result.rows.map((row) => row.id);
};

const loadExistingScopeJobIds = async (
  client: PoolClient,
  estimateId: string,
): Promise<Set<string>> => {
  const result = await client.query<{ catalog_scope_item_id: string }>(
    `SELECT catalog_scope_item_id FROM job
     WHERE estimate_id = $1 AND catalog_scope_item_id IS NOT NULL`,
    [estimateId],
  );
  return new Set(result.rows.map((row) => row.catalog_scope_item_id));
};

// ─── Slice → job creation ─────────────────────────────────────────────────────

const conditionDepth = (
  conditionId: string,
  conditionById: Map<string, EstimateConditionRow>,
): number => {
  let depth = 0;
  let current = conditionById.get(conditionId)?.parent_condition_id ?? null;
  const seen = new Set<string>([conditionId]);
  while (current && !seen.has(current)) {
    seen.add(current);
    depth += 1;
    current = conditionById.get(current)?.parent_condition_id ?? null;
  }
  return depth;
};

/** Copy the slice's condition forest → job_condition*; returns old→new id map. */
const copyConditionsForSliceTx = async (
  client: PoolClient,
  jobId: string,
  sliceConditionIds: Set<string>,
  conditionById: Map<string, EstimateConditionRow>,
): Promise<Map<string, string>> => {
  const idMap = new Map<string, string>();
  const ordered = [...sliceConditionIds]
    .map((id) => conditionById.get(id))
    .filter((row): row is EstimateConditionRow => row !== undefined)
    .sort(
      (a, b) =>
        conditionDepth(a.id, conditionById) - conditionDepth(b.id, conditionById) ||
        a.sort_order - b.sort_order ||
        a.id.localeCompare(b.id),
    );

  for (const condition of ordered) {
    const newId = crypto.randomUUID();
    idMap.set(condition.id, newId);

    const parentNewId = condition.parent_condition_id
      ? (idMap.get(condition.parent_condition_id) ?? null)
      : null;

    await client.query(
      `INSERT INTO job_condition (
         id, job_id, parent_condition_id, site_zone_id, name, complexity_factor_id,
         complexity_factor_id_at_win,
         labor_phases_explicit, labor_only, labor_only_explicit,
         include_discontinued, include_discontinued_explicit, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        newId,
        jobId,
        parentNewId,
        condition.site_zone_id,
        condition.name,
        condition.complexity_factor_id,
        // JC5: win baseline = copied current complexity (null stays null).
        condition.complexity_factor_id,
        condition.labor_phases_explicit,
        condition.labor_only,
        condition.labor_only_explicit,
        condition.include_discontinued,
        condition.include_discontinued_explicit,
        condition.sort_order,
      ],
    );

    await client.query(
      `INSERT INTO job_condition_spec (
         job_condition_id, spec_def_id, spec_option_id, value_boolean,
         value_number, value_number_max
       )
       SELECT $1, spec_def_id, spec_option_id, value_boolean, value_number, value_number_max
       FROM estimate_condition_spec
       WHERE estimate_condition_id = $2`,
      [newId, condition.id],
    );

    await client.query(
      `INSERT INTO job_condition_labor_phase (job_condition_id, labor_phase_id, sort_order)
       SELECT $1, labor_phase_id, sort_order
       FROM estimate_condition_labor_phase
       WHERE estimate_condition_id = $2`,
      [newId, condition.id],
    );
  }

  return idMap;
};

/** Order lines so a kit parent is inserted before its components (FK safe). */
const orderLinesParentsFirst = (lines: EstimateLineRow[]): EstimateLineRow[] =>
  [...lines].sort(
    (a, b) =>
      Number(a.parent_line_id !== null) - Number(b.parent_line_id !== null) ||
      a.sort_order - b.sort_order ||
      a.id.localeCompare(b.id),
  );

const copyLinesForSliceTx = async (
  client: PoolClient,
  jobId: string,
  sliceLines: EstimateLineRow[],
  conditionIdMap: Map<string, string>,
): Promise<void> => {
  const ordered = orderLinesParentsFirst(sliceLines);
  const lineIdMap = new Map<string, string>();
  for (const line of ordered) {
    lineIdMap.set(line.id, crypto.randomUUID());
  }

  let lineNumber = 0;
  for (const line of ordered) {
    lineNumber += 1;
    const newLineId = lineIdMap.get(line.id)!;
    const parentNewId =
      line.parent_line_id && lineIdMap.has(line.parent_line_id)
        ? lineIdMap.get(line.parent_line_id)!
        : null;
    const jobConditionId = conditionIdMap.get(line.estimate_condition_id) ?? null;

    await client.query(
      `INSERT INTO job_line (
         id, job_id, job_condition_id, line_number, line_role, line_kind,
         description, quantity, sold_quantity, qty_manual, unit, unit_cost, unit_price,
         unit_material, unit_labor, unit_freight, unit_incidental, unit_price_target,
         sold_unit_price, sold_unit_cost, sold_unit_material, sold_unit_labor,
         sold_unit_freight, sold_unit_incidental,
         sales_locked, material_locked, item_id, part_id, vendor_part_id,
         site_asset_id, estimate_line_id, parent_line_id, source, status, sort_order
       ) VALUES (
         $1, $2, $3, $4, $5, 'product',
         $6, $7, $7, $8, $9, $10, $11,
         $12, $13, $14, $15, $16,
         $11, $10, $12, $13,
         $14, $15,
         $17, $18, $19, $20, $21,
         $22, $23, $24, 'estimate', 'active', $25
       )`,
      [
        newLineId,
        jobId,
        jobConditionId,
        lineNumber,
        line.line_role,
        line.description,
        line.quantity,
        line.qty_manual,
        line.unit,
        line.unit_cost,
        line.unit_price,
        line.unit_material,
        line.unit_labor,
        line.unit_freight,
        line.unit_incidental,
        line.unit_price_target,
        line.sales_locked,
        line.material_locked,
        line.item_id,
        line.part_id,
        line.vendor_part_id,
        line.site_asset_id,
        line.id,
        parentNewId,
        line.sort_order,
      ],
    );

    await client.query(
      `INSERT INTO job_line_spec (
         job_line_id, spec_def_id, spec_option_id, value_boolean,
         value_number, value_number_max
       )
       SELECT $1, spec_def_id, spec_option_id, value_boolean, value_number, value_number_max
       FROM estimate_line_spec
       WHERE estimate_line_id = $2`,
      [newLineId, line.id],
    );

    const allocations = await client.query<{
      site_zone_id: string;
      quantity: string | number;
    }>(
      `SELECT site_zone_id, quantity
       FROM estimate_line_allocation
       WHERE estimate_line_id = $1
       ORDER BY site_zone_id ASC`,
      [line.id],
    );

    for (const alloc of allocations.rows) {
      await client.query(
        `INSERT INTO job_line_allocation (job_line_id, site_zone_id, quantity)
         VALUES ($1, $2, $3)`,
        [newLineId, alloc.site_zone_id, alloc.quantity],
      );
    }

    // W4: single allocation → mirror onto job_line.site_zone_id for display/compat.
    const singleZoneId =
      allocations.rows.length === 1 ? allocations.rows[0]!.site_zone_id : null;
    if (singleZoneId) {
      await client.query(
        `UPDATE job_line SET site_zone_id = $2 WHERE id = $1`,
        [newLineId, singleZoneId],
      );
    }

    // W5: seed phases from the source estimate condition (identical at win time),
    // then seed the engineering BOM from the sold snapshot.
    if (line.item_id) {
      await seedScopePhasesForJobLineTx(client, {
        job_line_id: newLineId,
        item_id: line.item_id,
        estimate_condition_id: line.estimate_condition_id,
        site_zone_id: singleZoneId,
        quantity: Number(line.quantity),
      });
    }
    await seedBomFromSoldLineTx(client, newLineId);
  }
};

type SliceContext = {
  estimate: EstimateHeader;
  conditionById: Map<string, EstimateConditionRow>;
  parentByConditionId: Map<string, string | null>;
  linesById: Map<string, EstimateLineRow>;
  scopeItemNameById: Map<string, string>;
};

const createJobForSliceTx = async (
  client: PoolClient,
  ctx: SliceContext,
  scopeItemId: string,
  sliceLineIds: string[],
): Promise<AcceptedJobSummary> => {
  const sliceLines = sliceLineIds
    .map((id) => ctx.linesById.get(id))
    .filter((row): row is EstimateLineRow => row !== undefined);

  const boundConditionIds = new Set(
    sliceLines.map((line) => line.estimate_condition_id),
  );
  const sliceConditionIds = collectSliceConditionIds(
    boundConditionIds,
    ctx.parentByConditionId,
  );

  const scopeItemName = ctx.scopeItemNameById.get(scopeItemId) ?? null;
  const title = buildJobTitle(ctx.estimate.title, scopeItemName);

  const jobId = crypto.randomUUID();
  await client.query(
    `INSERT INTO job (id, site_id, estimate_id, catalog_scope_item_id, title, job_kind, status)
     VALUES ($1, $2, $3, $4, $5, 'project', 'planned')`,
    [jobId, ctx.estimate.site_id, ctx.estimate.id, scopeItemId, title],
  );

  await client.query(
    `INSERT INTO job_party (job_id, party_id, relation_id, sort_order)
     SELECT $1, party_id, relation_id, sort_order
     FROM estimate_party
     WHERE estimate_id = $2`,
    [jobId, ctx.estimate.id],
  );

  const conditionIdMap = await copyConditionsForSliceTx(
    client,
    jobId,
    sliceConditionIds,
    ctx.conditionById,
  );

  await copyLinesForSliceTx(client, jobId, sliceLines, conditionIdMap);

  return { id: jobId, catalog_scope_item_id: scopeItemId, title };
};

const buildSliceContext = async (
  client: PoolClient,
  estimate: EstimateHeader,
): Promise<{ ctx: SliceContext; byScope: Map<string, string[]> }> => {
  const lines = await loadEstimateLines(client, estimate.id);
  const itemIds = [
    ...new Set(
      lines
        .map((line) => line.item_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  const scopeByItemId = await resolveCatalogScopeByItemId(client, itemIds);

  // Every quotable estimate line must resolve to a catalog scope root.
  for (const line of lines) {
    if (line.item_id && !scopeByItemId.has(line.item_id)) {
      throw new ValidationError("Estimate line item has no catalog scope root", {
        field: "line_items",
        code: "unresolved_catalog_scope",
        estimate_line_id: line.id,
        item_id: line.item_id,
      });
    }
  }

  const byScope = partitionLineIdsByCatalogScope(lines, scopeByItemId);

  const conditionById = await loadEstimateConditions(client, estimate.id);
  const parentByConditionId = new Map<string, string | null>(
    [...conditionById.values()].map((row) => [row.id, row.parent_condition_id]),
  );

  const scopeItemNameById = await loadItemNames(client, [...byScope.keys()]);

  const ctx: SliceContext = {
    estimate,
    conditionById,
    parentByConditionId,
    linesById: new Map(lines.map((line) => [line.id, line])),
    scopeItemNameById,
  };

  return { ctx, byScope };
};

// ─── Public API ────────────────────────────────────────────────────────────────

/** ST7: live-catalog recalc all lines, persist snapshots, then freeze as submitted. */
const submitEstimateTx = async (
  client: PoolClient,
  estimateId: string,
): Promise<void> => {
  const estimate = await loadEstimateHeaderForUpdate(client, estimateId);

  if (!canSubmitEstimate(estimate.status)) {
    throw new ConflictError("Estimate cannot be submitted from its current status", {
      field: "status",
      code: "estimate_not_submittable",
      status: estimate.status,
    });
  }

  const lines = await loadEstimateLines(client, estimateId);
  const inputs: RecalcLineInput[] = lines.map((line) => ({
    id: line.id,
    estimate_condition_id: line.estimate_condition_id,
    parent_line_id: line.parent_line_id,
    line_role: line.line_role as RecalcLineInput["line_role"],
    description: line.description,
    quantity: Number(line.quantity),
    qty_manual: Boolean(line.qty_manual),
    unit: line.unit,
    unit_cost: Number(line.unit_cost),
    unit_price: Number(line.unit_price),
    unit_material: Number(line.unit_material),
    unit_labor: Number(line.unit_labor),
    unit_freight: Number(line.unit_freight),
    unit_incidental: Number(line.unit_incidental),
    unit_price_target:
      line.unit_price_target === null || line.unit_price_target === undefined
        ? undefined
        : Number(line.unit_price_target),
    sales_locked: Boolean(line.sales_locked),
    material_locked: Boolean(line.material_locked),
    item_id: line.item_id,
    part_id: line.part_id,
    vendor_part_id: line.vendor_part_id,
  }));

  const priorIds = new Set(inputs.map((line) => line.id));
  const recalculated = await recalcLineItems(client, inputs, priorIds);

  for (const line of recalculated) {
    await client.query(
      `UPDATE estimate_line SET
         description = $2,
         quantity = $3,
         qty_manual = $4,
         unit = $5,
         unit_cost = $6,
         unit_price = $7,
         unit_material = $8,
         unit_labor = $9,
         unit_freight = $10,
         unit_incidental = $11,
         unit_price_target = $12,
         sales_locked = $13,
         material_locked = $14,
         item_id = $15,
         part_id = $16,
         vendor_part_id = $17
       WHERE id = $1 AND estimate_id = $18`,
      [
        line.id,
        line.description,
        line.quantity,
        line.qty_manual ?? false,
        line.unit,
        line.unit_cost,
        line.unit_price,
        line.unit_material,
        line.unit_labor,
        line.unit_freight,
        line.unit_incidental,
        line.unit_price_target ?? null,
        line.sales_locked ?? false,
        line.material_locked ?? false,
        line.item_id ?? null,
        line.part_id ?? null,
        line.vendor_part_id ?? null,
        estimateId,
      ],
    );
  }

  await client.query(
    `UPDATE estimate SET status = 'submitted', updated_at = now() WHERE id = $1`,
    [estimateId],
  );
};

/** ST7: full line recalc then freeze as `submitted`. */
export const submitEstimate = async (
  pool: Pool,
  actorId: string,
  estimateId: string,
): Promise<void> =>
  withPermissionDb(pool, actorId, (client) => submitEstimateTx(client, estimateId));

const acceptEstimateTx = async (
  client: PoolClient,
  estimateId: string,
  options: AcceptEstimateOptions,
): Promise<AcceptEstimateResult> => {
  const estimate = await loadEstimateHeaderForUpdate(client, estimateId);

  if (!isAcceptableStatus(estimate.status)) {
    throw new ConflictError("Estimate cannot be accepted from its current status", {
      field: "status",
      code: "estimate_not_acceptable",
      status: estimate.status,
    });
  }

  const { ctx, byScope } = await buildSliceContext(client, estimate);

  if (byScope.size === 0) {
    throw new ValidationError("Estimate has no line items to accept", {
      field: "line_items",
      code: "no_lines",
    });
  }

  if (!options.proceedDespiteActiveSiteJobs) {
    const activeJobIds = await loadActiveSiteJobIds(client, estimate.site_id);
    if (activeJobIds.length > 0) {
      throw new ConflictError("Site already has an active job", {
        field: "site",
        code: "site_has_active_job",
        site_id: estimate.site_id,
        job_ids: activeJobIds,
      });
    }
  }

  const existingScopes = await loadExistingScopeJobIds(client, estimateId);

  const jobs: AcceptedJobSummary[] = [];
  for (const scopeItemId of [...byScope.keys()].sort()) {
    if (existingScopes.has(scopeItemId)) {
      throw new ConflictError("A job already exists for this catalog scope", {
        field: "catalog_scope_item_id",
        code: "job_exists_for_scope",
        catalog_scope_item_id: scopeItemId,
      });
    }
    jobs.push(
      await createJobForSliceTx(client, ctx, scopeItemId, byScope.get(scopeItemId)!),
    );
  }

  await client.query(
    `UPDATE estimate SET status = 'accepted', updated_at = now() WHERE id = $1`,
    [estimateId],
  );

  return { jobs };
};

/**
 * ST8 / W1a–W5: accept a submitted estimate. Partitions lines by catalog scope,
 * creates one job per scope, sets `status = accepted`.
 */
export const acceptEstimate = async (
  pool: Pool,
  actorId: string,
  estimateId: string,
  options: AcceptEstimateOptions = {},
): Promise<AcceptEstimateResult> =>
  withPermissionDb(pool, actorId, (client) =>
    acceptEstimateTx(client, estimateId, options),
  );

const rejectEstimateTx = async (
  client: PoolClient,
  estimateId: string,
): Promise<void> => {
  const estimate = await loadEstimateHeaderForUpdate(client, estimateId);

  if (estimate.status === "accepted") {
    throw new ConflictError("An accepted estimate cannot be rejected", {
      field: "status",
      code: "estimate_already_accepted",
      status: estimate.status,
    });
  }

  if (estimate.status === "rejected") {
    return;
  }

  if (!canRejectEstimate(estimate.status)) {
    throw new ConflictError("Estimate cannot be rejected from its current status", {
      field: "status",
      code: "estimate_not_rejectable",
      status: estimate.status,
    });
  }

  await client.query(
    `UPDATE estimate SET status = 'rejected', updated_at = now() WHERE id = $1`,
    [estimateId],
  );
};

/** ST9: lock as rejected. Idempotent when already rejected; conflicts when accepted. */
export const rejectEstimate = async (
  pool: Pool,
  actorId: string,
  estimateId: string,
): Promise<void> =>
  withPermissionDb(pool, actorId, (client) => rejectEstimateTx(client, estimateId));

const recallEstimateTx = async (
  client: PoolClient,
  estimateId: string,
): Promise<void> => {
  const estimate = await loadEstimateHeaderForUpdate(client, estimateId);

  if (!canRecallEstimate(estimate.status)) {
    throw new ConflictError("Only a submitted estimate can be recalled to draft", {
      field: "status",
      code: "estimate_not_recallable",
      status: estimate.status,
    });
  }

  await client.query(
    `UPDATE estimate SET status = 'draft', updated_at = now() WHERE id = $1`,
    [estimateId],
  );
};

/** ST10: submitted → draft unlock for revise. */
export const recallEstimate = async (
  pool: Pool,
  actorId: string,
  estimateId: string,
): Promise<void> =>
  withPermissionDb(pool, actorId, (client) => recallEstimateTx(client, estimateId));

const recreateMissingJobsTx = async (
  client: PoolClient,
  estimateId: string,
): Promise<AcceptEstimateResult> => {
  const estimate = await loadEstimateHeaderForUpdate(client, estimateId);

  if (estimate.status !== "accepted") {
    throw new ConflictError("Only an accepted estimate can recreate missing jobs", {
      field: "status",
      code: "estimate_not_accepted",
      status: estimate.status,
    });
  }

  const { ctx, byScope } = await buildSliceContext(client, estimate);
  const existingScopes = await loadExistingScopeJobIds(client, estimateId);

  const jobs: AcceptedJobSummary[] = [];
  for (const scopeItemId of [...byScope.keys()].sort()) {
    if (existingScopes.has(scopeItemId)) {
      continue;
    }
    jobs.push(
      await createJobForSliceTx(client, ctx, scopeItemId, byScope.get(scopeItemId)!),
    );
  }

  return { jobs };
};

/**
 * W1b: recreate jobs for catalog-scope slices that have no live job (e.g. after a
 * job delete). Skips scopes that already have a job; the estimate stays `accepted`.
 */
export const recreateMissingJobs = async (
  pool: Pool,
  actorId: string,
  estimateId: string,
): Promise<AcceptEstimateResult> =>
  withPermissionDb(pool, actorId, (client) =>
    recreateMissingJobsTx(client, estimateId),
  );
