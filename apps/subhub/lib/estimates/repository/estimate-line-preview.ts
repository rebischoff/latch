import { ValidationError } from "@latch/contracts";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";

import {
  loadConditionAncestorIds,
  loadConditionBucketSpecs,
  loadLineBucketSpecs,
  mergeBucketSpecs,
  type BucketSpecValue,
  type MergedBucketSpecs,
} from "./estimate-bucket-specs";
import {
  loadCommercialCatalog,
  loadComplexityContext,
  loadConditionLaborPhases,
  type ComplexityContext,
} from "./estimate-commercial";
import {
  recalcProductLine,
  type RecalcContextOverrides,
  type RecalcLineInput,
  type RecalcLineOutput,
} from "./estimate-line-recalc";

const PreviewSpecSchema = z
  .object({
    spec_def_id: z.string(),
    spec_option_id: z.string().nullable().optional(),
    spec_threshold_preset_id: z.string().nullable().optional(),
    value_boolean: z.boolean().nullable().optional(),
    value_number: z.number().nullable().optional(),
    value_number_max: z.number().nullable().optional(),
  })
  .strict();

export const EstimateLinePreviewConditionDraftSchema = z
  .object({
    complexity_factor_id: z.string().nullable().optional(),
    labor_phases_explicit: z.boolean().optional(),
    included_labor_phases: z.array(z.string()).optional(),
    specs: z.array(PreviewSpecSchema).optional(),
  })
  .strict();

export const EstimateLinePreviewLineSchema = z
  .object({
    id: z.string(),
    item_id: z.string().nullable(),
    part_id: z.string().nullable().optional(),
    sales_locked: z.boolean().optional(),
    material_locked: z.boolean().optional(),
    quantity: z.number().optional(),
    unit_price: z.number().optional(),
    unit_material: z.number().optional(),
    unit_labor: z.number().optional(),
    unit_freight: z.number().optional(),
    unit_incidental: z.number().optional(),
    unit_cost: z.number().optional(),
    unit_price_target: z.number().optional(),
    unit: z.string().optional(),
    description: z.string().optional(),
    line_role: z.enum(["standalone", "kit_header", "kit_component"]).optional(),
    vendor_part_id: z.string().nullable().optional(),
  })
  .strict();

export const EstimateLinePreviewRequestSchema = z
  .object({
    condition_id: z.string(),
    condition_draft: EstimateLinePreviewConditionDraftSchema.optional(),
    lines: z.array(EstimateLinePreviewLineSchema).min(1),
  })
  .strict();

export type EstimateLinePreviewRequest = z.infer<
  typeof EstimateLinePreviewRequestSchema
>;

export type EstimateLinePreviewResultLine = {
  id: string;
  part_id: string | null;
  vendor_part_id: string | null;
  unit_material: number;
  unit_freight: number;
  unit_incidental: number;
  unit_labor: number;
  unit_cost: number;
  unit_price_target: number;
  unit_price: number;
};

const loadEstimateStatusById = async (
  client: Pool | PoolClient,
  estimateId: string,
): Promise<string | null> => {
  const result = await client.query<{ status: string }>(
    `SELECT status FROM estimate WHERE id = $1`,
    [estimateId],
  );
  return result.rows[0]?.status ?? null;
};

const assertConditionBelongsToEstimate = async (
  client: Pool | PoolClient,
  estimateId: string,
  conditionId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM estimate_condition WHERE id = $1 AND estimate_id = $2`,
    [conditionId, estimateId],
  );
  if (result.rows.length === 0) {
    throw new ValidationError("condition_id must belong to this estimate", {
      field: "condition_id",
      code: "unknown_condition",
    });
  }
};

const loadMergedBucketWithDraft = async (
  client: Pool | PoolClient,
  conditionId: string,
  lineId: string | null,
  draftSpecs: BucketSpecValue[] | undefined,
): Promise<MergedBucketSpecs> => {
  const conditionSpecsRootToLeaf: BucketSpecValue[] = [];
  const leafToRoot = await loadConditionAncestorIds(client, conditionId);
  for (const ancestorId of [...leafToRoot].reverse()) {
    if (draftSpecs && ancestorId === conditionId) {
      conditionSpecsRootToLeaf.push(...draftSpecs);
    } else {
      conditionSpecsRootToLeaf.push(
        ...(await loadConditionBucketSpecs(client, ancestorId)),
      );
    }
  }

  const lineSpecs =
    lineId !== null ? await loadLineBucketSpecs(client, lineId) : [];

  return mergeBucketSpecs(conditionSpecsRootToLeaf, lineSpecs);
};

const resolveDraftComplexity = async (
  client: Pool | PoolClient,
  conditionId: string,
  draft: EstimateLinePreviewRequest["condition_draft"],
): Promise<ComplexityContext> => {
  if (!draft || draft.complexity_factor_id === undefined) {
    return loadComplexityContext(client, conditionId);
  }

  if (draft.complexity_factor_id === null) {
    // Inherit from ancestors (skip this condition's own factor).
    const ancestors = await loadConditionAncestorIds(client, conditionId);
    const parentId = ancestors[1] ?? null;
    return loadComplexityContext(client, parentId);
  }

  const result = await client.query<{ factor_percent: number }>(
    `SELECT factor_percent FROM complexity_factor WHERE id = $1`,
    [draft.complexity_factor_id],
  );
  const percent = result.rows[0]?.factor_percent;
  if (percent === undefined || percent === null) {
    return loadComplexityContext(client, conditionId);
  }
  return { condition_factor_percent: Number(percent) };
};

const resolveDraftLaborPhases = async (
  client: Pool | PoolClient,
  conditionId: string,
  draft: EstimateLinePreviewRequest["condition_draft"],
): Promise<string[] | null> => {
  if (!draft || draft.labor_phases_explicit === undefined) {
    return loadConditionLaborPhases(client, conditionId);
  }

  if (!draft.labor_phases_explicit) {
    const ancestors = await loadConditionAncestorIds(client, conditionId);
    const parentId = ancestors[1] ?? null;
    return parentId ? loadConditionLaborPhases(client, parentId) : null;
  }

  return draft.included_labor_phases ?? [];
};

const toPreviewResult = (row: RecalcLineOutput): EstimateLinePreviewResultLine => ({
  id: row.id,
  part_id: row.part_id ?? null,
  vendor_part_id: row.vendor_part_id ?? null,
  unit_material: row.unit_material,
  unit_freight: row.unit_freight,
  unit_incidental: row.unit_incidental,
  unit_labor: row.unit_labor,
  unit_cost: row.unit_cost,
  unit_price_target: row.unit_price_target,
  unit_price: row.unit_price,
});

/**
 * Non-persisting commercial preview for 1..n lines under a condition.
 * Reuses `recalcProductLine`; never writes lock flags or line rows.
 */
export const previewEstimateLines = async (
  client: Pool | PoolClient,
  estimateId: string,
  request: EstimateLinePreviewRequest,
): Promise<{ lines: EstimateLinePreviewResultLine[] }> => {
  const status = await loadEstimateStatusById(client, estimateId);
  if (status !== "draft") {
    throw new ValidationError("Line preview is only available on draft estimates", {
      field: "status",
      code: "not_draft",
    });
  }

  await assertConditionBelongsToEstimate(client, estimateId, request.condition_id);

  const draft = request.condition_draft;
  const draftSpecs: BucketSpecValue[] | undefined = draft?.specs?.map((spec) => ({
    spec_def_id: spec.spec_def_id,
    spec_option_id: spec.spec_option_id ?? null,
    spec_threshold_preset_id: spec.spec_threshold_preset_id ?? null,
    value_boolean: spec.value_boolean ?? null,
    value_number: spec.value_number ?? null,
    value_number_max: spec.value_number_max ?? null,
  }));

  const [catalog, complexity, laborPhases] = await Promise.all([
    loadCommercialCatalog(client),
    resolveDraftComplexity(client, request.condition_id, draft),
    resolveDraftLaborPhases(client, request.condition_id, draft),
  ]);

  const results: EstimateLinePreviewResultLine[] = [];

  for (const line of request.lines) {
    const bucket = await loadMergedBucketWithDraft(
      client,
      request.condition_id,
      line.id,
      draftSpecs,
    );

    const overrides: RecalcContextOverrides = {
      bucket,
      complexity,
      laborPhases,
    };

    const input: RecalcLineInput = {
      id: line.id,
      line_role: line.line_role ?? "standalone",
      description: line.description ?? "",
      quantity: line.quantity ?? 1,
      unit: line.unit ?? "ea",
      unit_cost: line.unit_cost ?? 0,
      unit_price: line.unit_price ?? 0,
      unit_material: line.unit_material,
      unit_labor: line.unit_labor,
      unit_freight: line.unit_freight,
      unit_incidental: line.unit_incidental,
      unit_price_target: line.unit_price_target,
      estimate_condition_id: request.condition_id,
      item_id: line.item_id,
      part_id: line.part_id ?? null,
      vendor_part_id: line.vendor_part_id ?? null,
      sales_locked: line.sales_locked ?? false,
      material_locked: line.material_locked ?? false,
      is_new: false,
    };

    const recalculated = await recalcProductLine(
      client,
      input,
      catalog,
      overrides,
    );
    results.push(toPreviewResult(recalculated));
  }

  return { lines: results };
};
