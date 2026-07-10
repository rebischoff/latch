import type { Pool, PoolClient } from "pg";

export type BucketSpecValue = {
  spec_def_id: string;
  spec_option_id: string | null;
  value_boolean: boolean | null;
  value_number: number | null;
};

export type MergedBucketSpecs = Map<string, BucketSpecValue>;

const mergeTier = (
  target: MergedBucketSpecs,
  rows: BucketSpecValue[],
): void => {
  for (const row of rows) {
    if (isBucketValueBlank(row)) {
      continue;
    }
    target.set(row.spec_def_id, row);
  }
};

export const loadConditionBucketSpecs = async (
  client: Pool | PoolClient,
  estimateConditionId: string,
): Promise<BucketSpecValue[]> => {
  const result = await client.query<BucketSpecValue>(
    `SELECT spec_def_id::text,
            spec_option_id,
            value_boolean,
            value_number
     FROM estimate_condition_spec
     WHERE estimate_condition_id = $1`,
    [estimateConditionId],
  );

  return result.rows;
};

/** Ancestor chain leaf → … → root (includes `estimateConditionId`). */
export const loadConditionAncestorIds = async (
  client: Pool | PoolClient,
  estimateConditionId: string,
): Promise<string[]> => {
  const chain: string[] = [];
  let current: string | null = estimateConditionId;
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current)) {
      break;
    }
    seen.add(current);
    chain.push(current);

    const parentResult: { rows: Array<{ parent_condition_id: string | null }> } =
      await client.query(
        `SELECT parent_condition_id FROM estimate_condition WHERE id = $1`,
        [current],
      );
    current = parentResult.rows[0]?.parent_condition_id ?? null;
  }

  return chain;
};

export const loadLineBucketSpecs = async (
  client: Pool | PoolClient,
  estimateLineId: string,
): Promise<BucketSpecValue[]> => {
  const result = await client.query<BucketSpecValue>(
    `SELECT spec_def_id::text,
            spec_option_id,
            value_boolean,
            value_number
     FROM estimate_line_spec
     WHERE estimate_line_id = $1`,
    [estimateLineId],
  );

  return result.rows;
};

/**
 * Merge order (later wins): condition ancestors (root→leaf) → line.
 * No estimate_scope tier (37y Y3).
 */
export const mergeBucketSpecs = (
  conditionSpecsRootToLeaf: BucketSpecValue[],
  lineSpecs: BucketSpecValue[],
): MergedBucketSpecs => {
  const merged: MergedBucketSpecs = new Map();
  mergeTier(merged, conditionSpecsRootToLeaf);
  mergeTier(merged, lineSpecs);
  return merged;
};

export const loadMergedBucketForLine = async (
  client: Pool | PoolClient,
  estimateConditionId: string,
  estimateLineId: string | null,
): Promise<MergedBucketSpecs> => {
  const conditionSpecsRootToLeaf: BucketSpecValue[] = [];
  const leafToRoot = await loadConditionAncestorIds(client, estimateConditionId);
  for (const conditionId of [...leafToRoot].reverse()) {
    const specs = await loadConditionBucketSpecs(client, conditionId);
    conditionSpecsRootToLeaf.push(...specs);
  }

  const lineSpecs =
    estimateLineId !== null ? await loadLineBucketSpecs(client, estimateLineId) : [];

  return mergeBucketSpecs(conditionSpecsRootToLeaf, lineSpecs);
};

export const isBucketValueBlank = (spec: BucketSpecValue): boolean =>
  spec.spec_option_id === null &&
  spec.value_boolean === null &&
  spec.value_number === null;

/** @deprecated Scope tier removed in 37y — returns []. */
export const loadScopeBucketSpecs = async (
  _client: Pool | PoolClient,
  _estimateScopeId: string,
): Promise<BucketSpecValue[]> => [];
