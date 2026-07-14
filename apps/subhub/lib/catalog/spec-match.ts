export type PartSpecMatchRow = {
  spec_option_id: string | null;
  value_boolean: boolean | null;
  value_number: number | null;
  value_number_max: number | null;
};

export type BucketMatchInput = {
  spec_option_id: string | null;
  value_boolean: boolean | null;
  value_number: number | null;
  value_number_max: number | null;
};

/** T3 bucket interval: null min → −∞, null max → +∞. */
export const bucketNumericBounds = (
  valueNumber: number | null,
  valueNumberMax: number | null,
): { min: number; max: number } => ({
  min: valueNumber ?? Number.NEGATIVE_INFINITY,
  max: valueNumberMax ?? Number.POSITIVE_INFINITY,
});

/** Part bands use exact point when only `value_number` is set (N5). */
export const partNumericBounds = (
  valueNumber: number | null,
  valueNumberMax: number | null,
): { min: number; max: number } | null => {
  if (valueNumber === null && valueNumberMax === null) {
    return null;
  }

  if (valueNumber !== null && valueNumberMax === null) {
    return { min: valueNumber, max: valueNumber };
  }

  if (valueNumber === null && valueNumberMax !== null) {
    return { min: Number.NEGATIVE_INFINITY, max: valueNumberMax };
  }

  return {
    min: valueNumber ?? Number.NEGATIVE_INFINITY,
    max: valueNumberMax ?? Number.POSITIVE_INFINITY,
  };
};

export const numericIntervalsOverlap = (
  leftMin: number,
  leftMax: number,
  rightMin: number,
  rightMax: number,
): boolean => leftMin <= rightMax && rightMin <= leftMax;

export const numberBucketMatchesPartRows = (
  bucketMin: number | null,
  bucketMax: number | null,
  partRows: PartSpecMatchRow[],
): boolean => {
  if (partRows.length === 0) {
    return true;
  }

  const bucket = bucketNumericBounds(bucketMin, bucketMax);

  return partRows.some((row) => {
    const part = partNumericBounds(row.value_number, row.value_number_max);
    if (!part) {
      return false;
    }

    return numericIntervalsOverlap(bucket.min, bucket.max, part.min, part.max);
  });
};

export const enumOptionSetMatches = (
  bucketOptionIds: Set<string>,
  partRows: PartSpecMatchRow[],
  wildcardOptionId: string | null,
): boolean => {
  if (partRows.length === 0) {
    return true;
  }

  const partOptionIds = new Set(
    partRows
      .map((row) => row.spec_option_id)
      .filter((id): id is string => id !== null),
  );

  for (const optionId of bucketOptionIds) {
    if (partOptionIds.has(optionId)) {
      return true;
    }
  }

  if (wildcardOptionId && partOptionIds.has(wildcardOptionId)) {
    return true;
  }

  return false;
};

export const bucketSpecMatchesPartRows = (
  bucket: BucketMatchInput,
  partRows: PartSpecMatchRow[],
  valueType: "boolean" | "enum" | "number",
  wildcardOptionId: string | null,
): boolean => {
  if (valueType === "boolean") {
    if (bucket.value_boolean === null) {
      return true;
    }

    if (partRows.length === 0) {
      return true;
    }

    return partRows.some((row) => row.value_boolean === bucket.value_boolean);
  }

  if (valueType === "enum") {
    if (!bucket.spec_option_id) {
      return true;
    }

    return enumOptionSetMatches(
      new Set([bucket.spec_option_id]),
      partRows,
      wildcardOptionId,
    );
  }

  if (bucket.value_number === null && bucket.value_number_max === null) {
    return true;
  }

  return numberBucketMatchesPartRows(
    bucket.value_number,
    bucket.value_number_max,
    partRows,
  );
};
