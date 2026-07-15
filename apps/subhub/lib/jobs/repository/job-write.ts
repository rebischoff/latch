import { ConflictError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { isUniqueViolation } from "../../sites/repository/sql-utils";
import type {
  JobDetailRelatedPatch,
  JobDetailRow,
  JobDetailWriteRow,
} from "../descriptors/job-detail";
import { replaceJobLineItemsTx } from "./job-lines-write";
import { replaceJobStakeholdersTx } from "./job-stakeholders";

const JOB_KINDS = new Set(["project", "service", "warranty"]);
const PATCH_STATUSES = new Set(["planned", "active", "cancelled"]);

const assertSiteExists = async (
  client: Pool | PoolClient,
  siteId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM site WHERE id = $1`,
    [siteId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Invalid site_id", {
      field: "profile",
      code: "unknown_site",
    });
  }
};

const assertJobKind = (jobKind: string): void => {
  if (!JOB_KINDS.has(jobKind)) {
    throw new ValidationError("Invalid job_kind", {
      field: "profile",
      code: "invalid_job_kind",
      job_kind: jobKind,
    });
  }
};

const assertPatchStatus = (status: string): void => {
  if (!PATCH_STATUSES.has(status)) {
    throw new ValidationError("Invalid status", {
      field: "profile",
      code: "invalid_status",
      status,
    });
  }
};

/**
 * Site change allowed when `estimate_id` is null (S8).
 * Existing line items are auto-cleared in `updateJob` (job Scope UI is stubbed;
 * clients cannot PATCH `line_items` yet).
 */
export const assertSiteIdChangeAllowed = (
  existing: Pick<JobDetailRow, "site_id" | "estimate_id">,
  nextSiteId: string,
): void => {
  if (nextSiteId === existing.site_id) {
    return;
  }

  if (existing.estimate_id !== null) {
    throw new ConflictError("Cannot change site_id when job is linked to an estimate", {
      field: "profile",
      code: "site_id_frozen",
    });
  }
};

const validateJobWriteRow = async (
  client: Pool | PoolClient,
  row: JobDetailWriteRow,
  existing?: JobDetailRow,
): Promise<void> => {
  await assertSiteExists(client, row.site_id);
  assertJobKind(row.job_kind);
  assertPatchStatus(row.status);

  if (existing !== undefined) {
    assertSiteIdChangeAllowed(existing, row.site_id);
  }
};

export const insertJob = async (
  pool: Pool,
  actorId: string,
  row: JobDetailWriteRow,
  related?: JobDetailRelatedPatch,
): Promise<void> => {
  try {
    await withPermissionDb(pool, actorId, async (client) => {
      await validateJobWriteRow(client, row);

      await client.query(
        `INSERT INTO job (
           id,
           title,
           site_id,
           job_kind,
           status
         )
         VALUES ($1, $2, $3, 'project', 'planned')`,
        [row.id, row.title, row.site_id],
      );

      if (related?.stakeholders !== undefined) {
        await replaceJobStakeholdersTx(client, row.id, related.stakeholders);
      }

      if (related?.line_items !== undefined) {
        await replaceJobLineItemsTx(client, row.id, row.site_id, related.line_items);
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Job already exists");
    }
    throw error;
  }
};

export const updateJob = async (
  pool: Pool,
  actorId: string,
  row: JobDetailWriteRow,
  existing: JobDetailRow,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await validateJobWriteRow(client, row, existing);

    const siteChanged = row.site_id !== existing.site_id;

    await client.query(
      `UPDATE job
       SET title = $2,
           site_id = $3,
           job_kind = $4,
           status = $5,
           updated_at = now()
       WHERE id = $1`,
      [row.id, row.title, row.site_id, row.job_kind, row.status],
    );

    // Auto-clear lines when site changes (warn-and-clear; Scope editor still stubbed).
    if (siteChanged) {
      await replaceJobLineItemsTx(client, row.id, row.site_id, []);
    }
  });
};
