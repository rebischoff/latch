import type { Pool, PoolClient } from "pg";

import { loadMergedBucketForLine } from "./estimate-bucket-specs";
import { resolveFilteredParts } from "./estimate-part-resolver";

export const loadFilteredPartsForLine = async (
  client: Pool | PoolClient,
  estimateConditionId: string,
  estimateLineId: string | null,
  itemId: string,
) => {
  const bucket = await loadMergedBucketForLine(
    client,
    estimateConditionId,
    estimateLineId,
  );

  return resolveFilteredParts(client, itemId, bucket);
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
