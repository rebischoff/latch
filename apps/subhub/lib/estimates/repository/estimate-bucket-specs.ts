import type { Pool, PoolClient } from "pg";

export type BucketSpecValue = {
  spec_def_id: string;
  spec_option_id: string | null;
  value_boolean: boolean | null;
  value_text: string | null;
  value_number: number | null;
};

export type MergedBucketSpecs = Map<string, BucketSpecValue>;

const mergeTier = (
  target: MergedBucketSpecs,
  rows: BucketSpecValue[],
): void => {
  for (const row of rows) {
    target.set(row.spec_def_id, row);
  }
};

export const loadScopeBucketSpecs = async (
  client: Pool | PoolClient,
  estimateScopeId: string,
): Promise<BucketSpecValue[]> => {
  const result = await client.query<BucketSpecValue>(
    `SELECT spec_def_id::text,
            spec_option_id,
            value_text,
            value_boolean,
            NULL::numeric AS value_number
     FROM estimate_scope_spec
     WHERE estimate_scope_id = $1`,
    [estimateScopeId],
  );

  return result.rows;
};

export const loadZoneBucketSpecs = async (
  client: Pool | PoolClient,
  estimateScopeId: string,
  siteZoneId: string,
): Promise<BucketSpecValue[]> => {
  const result = await client.query<BucketSpecValue>(
    `SELECT spec_def_id::text,
            spec_option_id,
            value_text,
            value_boolean,
            NULL::numeric AS value_number
     FROM estimate_zone_spec
     WHERE estimate_scope_id = $1
       AND site_zone_id = $2`,
    [estimateScopeId, siteZoneId],
  );

  return result.rows;
};

export const loadLineBucketSpecs = async (
  client: Pool | PoolClient,
  estimateLineId: string,
): Promise<BucketSpecValue[]> => {
  const result = await client.query<BucketSpecValue>(
    `SELECT spec_def_id::text,
            spec_option_id,
            value_text,
            value_boolean,
            NULL::numeric AS value_number
     FROM estimate_line_spec
     WHERE estimate_line_id = $1`,
    [estimateLineId],
  );

  return result.rows;
};

export const mergeBucketSpecs = (
  scopeSpecs: BucketSpecValue[],
  zoneSpecs: BucketSpecValue[],
  lineSpecs: BucketSpecValue[],
): MergedBucketSpecs => {
  const merged: MergedBucketSpecs = new Map();
  mergeTier(merged, scopeSpecs);
  mergeTier(merged, zoneSpecs);
  mergeTier(merged, lineSpecs);
  return merged;
};

export const loadMergedBucketForLine = async (
  client: Pool | PoolClient,
  estimateScopeId: string,
  siteZoneId: string | null,
  estimateLineId: string | null,
): Promise<MergedBucketSpecs> => {
  const scopeSpecs = await loadScopeBucketSpecs(client, estimateScopeId);
  const zoneSpecs =
    siteZoneId !== null
      ? await loadZoneBucketSpecs(client, estimateScopeId, siteZoneId)
      : [];
  const lineSpecs =
    estimateLineId !== null ? await loadLineBucketSpecs(client, estimateLineId) : [];

  return mergeBucketSpecs(scopeSpecs, zoneSpecs, lineSpecs);
};

export const isBucketValueBlank = (spec: BucketSpecValue): boolean =>
  spec.spec_option_id === null &&
  spec.value_boolean === null &&
  spec.value_text === null &&
  spec.value_number === null;
