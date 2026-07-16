import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import type { JobDetailRelatedPatch } from "../descriptors/job-detail";
import {
  loadJobConditionIds,
  replaceJobConditionsTx,
} from "./job-conditions-write";
import { replaceJobLineItemsTx } from "./job-lines-write";

/**
 * Replace a job's condition forest and/or engineering line items in one
 * transaction. Conditions are written first so their ids validate the lines'
 * `job_condition_id` binds (task 46 Step 4).
 */
export const replaceJobCollectionsTx = async (
  client: PoolClient,
  jobId: string,
  siteId: string,
  related: Pick<JobDetailRelatedPatch, "conditions" | "line_items">,
): Promise<void> => {
  let validConditionIds: Set<string>;

  if (related.conditions !== undefined) {
    validConditionIds = await replaceJobConditionsTx(
      client,
      jobId,
      related.conditions,
      related.line_items,
    );
  } else {
    validConditionIds = await loadJobConditionIds(client, jobId);
  }

  if (related.line_items !== undefined) {
    await replaceJobLineItemsTx(
      client,
      jobId,
      siteId,
      related.line_items,
      validConditionIds,
    );
  }
};

export const replaceJobCollections = async (
  pool: Pool,
  actorId: string,
  jobId: string,
  siteId: string,
  related: Pick<JobDetailRelatedPatch, "conditions" | "line_items">,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceJobCollectionsTx(client, jobId, siteId, related);
  });
};
