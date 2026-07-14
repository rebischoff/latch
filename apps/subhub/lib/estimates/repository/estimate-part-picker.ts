import type { Pool, PoolClient } from "pg";
import { z } from "zod";

import {
  loadMergedBucketWithDraft,
  type BucketSpecValue,
} from "./estimate-bucket-specs";
import { resolveFilteredParts } from "./estimate-part-resolver";

const PartPickerDraftSpecSchema = z
  .object({
    spec_def_id: z.string(),
    spec_option_id: z.string().nullable().optional(),
    value_boolean: z.boolean().nullable().optional(),
    value_number: z.number().nullable().optional(),
    value_number_max: z.number().nullable().optional(),
  })
  .strict();

export const EstimatePartPickerRequestSchema = z
  .object({
    item_id: z.string().min(1),
    estimate_condition_id: z.string().min(1),
    line_id: z.string().nullable().optional(),
    condition_draft: z
      .object({
        specs: z.array(PartPickerDraftSpecSchema).optional(),
        include_discontinued: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type EstimatePartPickerRequest = z.infer<
  typeof EstimatePartPickerRequestSchema
>;

const toDraftSpecs = (
  draft: EstimatePartPickerRequest["condition_draft"],
): BucketSpecValue[] | undefined => {
  if (!draft?.specs) {
    return undefined;
  }
  return draft.specs.map((spec) => ({
    spec_def_id: spec.spec_def_id,
    spec_option_id: spec.spec_option_id ?? null,
    value_boolean: spec.value_boolean ?? null,
    value_number: spec.value_number ?? null,
    value_number_max: spec.value_number_max ?? null,
  }));
};

export const loadConditionIncludeDiscontinued = async (
  client: Pool | PoolClient,
  estimateConditionId: string,
): Promise<boolean> => {
  const result = await client.query<{ include_discontinued: boolean }>(
    `SELECT include_discontinued
     FROM estimate_condition
     WHERE id = $1`,
    [estimateConditionId],
  );

  return result.rows[0]?.include_discontinued ?? false;
};

const resolveIncludeDiscontinued = (
  draft: EstimatePartPickerRequest["condition_draft"],
  persisted: boolean,
): boolean => {
  if (draft?.include_discontinued !== undefined) {
    return draft.include_discontinued;
  }
  return persisted;
};

export const loadFilteredPartsForLine = async (
  client: Pool | PoolClient,
  estimateConditionId: string,
  estimateLineId: string | null,
  itemId: string,
  draftSpecs?: BucketSpecValue[],
  draftIncludeDiscontinued?: boolean,
) => {
  const bucket = await loadMergedBucketWithDraft(
    client,
    estimateConditionId,
    estimateLineId,
    draftSpecs,
  );

  const includeDiscontinued =
    draftIncludeDiscontinued ??
    (await loadConditionIncludeDiscontinued(client, estimateConditionId));

  return resolveFilteredParts(client, itemId, bucket, includeDiscontinued);
};

export const loadFilteredPartsWithDraft = async (
  client: Pool | PoolClient,
  request: EstimatePartPickerRequest,
) => {
  const draftSpecs = toDraftSpecs(request.condition_draft);
  const persisted = await loadConditionIncludeDiscontinued(
    client,
    request.estimate_condition_id,
  );
  const includeDiscontinued = resolveIncludeDiscontinued(
    request.condition_draft,
    persisted,
  );

  const bucket = await loadMergedBucketWithDraft(
    client,
    request.estimate_condition_id,
    request.line_id ?? null,
    draftSpecs,
  );

  return resolveFilteredParts(
    client,
    request.item_id,
    bucket,
    includeDiscontinued,
  );
};

export const loadFilteredPartsForEstimateLine = async (
  pool: Pool,
  estimateId: string,
  lineId: string,
  itemId: string,
) => {
  const lineResult = await pool.query<{
    estimate_condition_id: string;
  }>(
    `SELECT estimate_condition_id
     FROM estimate_line
     WHERE id = $1 AND estimate_id = $2`,
    [lineId, estimateId],
  );

  const line = lineResult.rows[0];
  if (!line) {
    return [];
  }

  return loadFilteredPartsForLine(
    pool,
    line.estimate_condition_id,
    lineId,
    itemId,
  );
};
