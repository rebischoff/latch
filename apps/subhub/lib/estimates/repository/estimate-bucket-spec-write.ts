import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

import type { EstimateConditionSpecPatchRow } from "../descriptors/estimate-detail";

export type BucketSpecWritable = {
  spec_def_id: string;
  spec_option_id?: string | null;
  value_boolean?: boolean | null;
  value_number?: number | null;
  value_number_max?: number | null;
};

export const isBucketSpecBlank = (spec: BucketSpecWritable): boolean =>
  (spec.spec_option_id ?? null) === null &&
  (spec.value_boolean ?? null) === null &&
  (spec.value_number ?? null) === null &&
  (spec.value_number_max ?? null) === null;

export const isBucketSpecValueSet = (
  spec: BucketSpecWritable & { value_type?: "boolean" | "enum" | "number" },
): boolean => {
  if (spec.value_type === "boolean") {
    return (spec.value_boolean ?? null) !== null;
  }

  if (spec.value_type === "number") {
    return (
      (spec.value_number ?? null) !== null || (spec.value_number_max ?? null) !== null
    );
  }

  return (spec.spec_option_id ?? null) !== null;
};

export const assertBucketSpecMutualExclusion = (
  spec: BucketSpecWritable,
  field: string,
  context?: string,
): void => {
  const hasOption = (spec.spec_option_id ?? null) !== null;
  const hasNumeric =
    (spec.value_number ?? null) !== null || (spec.value_number_max ?? null) !== null;

  if (hasOption && hasNumeric) {
    throw new ValidationError(
      "Bucket spec row may set only one of option or numeric bounds",
      {
        field,
        code: "bucket_spec_exclusive",
        spec_def_id: spec.spec_def_id,
        context,
      },
    );
  }
};

export const assertBucketSpecWritable = async (
  client: PoolClient,
  spec: EstimateConditionSpecPatchRow,
  field: string,
  context?: string,
): Promise<void> => {
  assertBucketSpecMutualExclusion(spec, field, context);

  if (
    spec.value_number !== null &&
    spec.value_number !== undefined &&
    spec.value_number_max !== null &&
    spec.value_number_max !== undefined &&
    spec.value_number > spec.value_number_max
  ) {
    throw new ValidationError("Bucket numeric min must be less than or equal to max", {
      field,
      code: "bucket_numeric_bounds",
      spec_def_id: spec.spec_def_id,
      context,
    });
  }
};

export const insertConditionBucketSpecTx = async (
  client: PoolClient,
  estimateConditionId: string,
  spec: EstimateConditionSpecPatchRow,
): Promise<void> => {
  await client.query(
    `INSERT INTO estimate_condition_spec (
       estimate_condition_id,
       spec_def_id,
       spec_option_id,
       value_boolean,
       value_number,
       value_number_max
     )
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      estimateConditionId,
      spec.spec_def_id,
      spec.spec_option_id ?? null,
      spec.value_boolean ?? null,
      spec.value_number ?? null,
      spec.value_number_max ?? null,
    ],
  );
};

export const insertLineBucketSpecTx = async (
  client: PoolClient,
  estimateLineId: string,
  spec: EstimateConditionSpecPatchRow,
): Promise<void> => {
  await client.query(
    `INSERT INTO estimate_line_spec (
       estimate_line_id,
       spec_def_id,
       spec_option_id,
       value_boolean,
       value_number,
       value_number_max
     )
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      estimateLineId,
      spec.spec_def_id,
      spec.spec_option_id ?? null,
      spec.value_boolean ?? null,
      spec.value_number ?? null,
      spec.value_number_max ?? null,
    ],
  );
};

export const replaceLineBucketSpecsTx = async (
  client: PoolClient,
  estimateLineId: string,
  specs: EstimateConditionSpecPatchRow[],
): Promise<void> => {
  const seen = new Set<string>();
  for (const spec of specs) {
    if (seen.has(spec.spec_def_id)) {
      throw new ValidationError("Duplicate spec_def_id in line specs", {
        field: "line_specs",
        code: "duplicate_spec",
        estimate_line_id: estimateLineId,
        spec_def_id: spec.spec_def_id,
      });
    }
    seen.add(spec.spec_def_id);
    await assertBucketSpecWritable(client, spec, "line_specs", estimateLineId);
  }

  await client.query(`DELETE FROM estimate_line_spec WHERE estimate_line_id = $1`, [
    estimateLineId,
  ]);

  for (const spec of specs) {
    if (isBucketSpecBlank(spec)) {
      continue;
    }

    await insertLineBucketSpecTx(client, estimateLineId, spec);
  }
};
