import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { tableExists } from "../../sites/repository/sql-utils";
import type { JobLineItemPatchRow } from "../descriptors/job-detail";

const assertSiteLocationBelongsToSite = async (
  client: PoolClient,
  siteLocationId: string,
  siteId: string,
): Promise<void> => {
  if (!(await tableExists(client, "site_location"))) {
    throw new ValidationError("site_location_id is not available", {
      field: "line_items",
      code: "unknown_location",
      site_location_id: siteLocationId,
    });
  }

  const result = await client.query<{ id: string }>(
    `SELECT id FROM site_location WHERE id = $1 AND site_id = $2`,
    [siteLocationId, siteId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("site_location_id does not belong to job site", {
      field: "line_items",
      code: "invalid_location",
      site_location_id: siteLocationId,
    });
  }
};

const validateLineItems = async (
  client: PoolClient,
  siteId: string,
  rows: JobLineItemPatchRow[],
): Promise<Array<JobLineItemPatchRow & { id: string }>> => {
  const normalized = rows.map((row) => ({
    ...row,
    id: row.id ?? crypto.randomUUID(),
  }));

  const headerIds = new Set(
    normalized
      .filter((row) => row.line_role === "kit_header")
      .map((row) => row.id),
  );

  for (const row of normalized) {
    if (row.line_role === "kit_component") {
      if (row.parent_line_id === null || row.parent_line_id === undefined) {
        throw new ValidationError("kit_component requires parent_line_id", {
          field: "line_items",
          code: "missing_parent",
          id: row.id,
        });
      }

      if (!headerIds.has(row.parent_line_id)) {
        throw new ValidationError(
          "kit_component parent_line_id must reference a kit_header in the same payload",
          {
            field: "line_items",
            code: "orphan_component",
            id: row.id,
            parent_line_id: row.parent_line_id,
          },
        );
      }
    } else if (row.parent_line_id !== null && row.parent_line_id !== undefined) {
      throw new ValidationError("parent_line_id is only valid for kit_component rows", {
        field: "line_items",
        code: "invalid_parent",
        id: row.id,
      });
    }

    if (row.line_kind === "labor" && row.phase_id) {
      if (await tableExists(client, "phase")) {
        const phaseResult = await client.query<{ id: string }>(
          `SELECT id FROM phase WHERE id = $1`,
          [row.phase_id],
        );
        if (phaseResult.rows.length === 0) {
          throw new ValidationError("Unknown phase_id on labor line", {
            field: "line_items",
            code: "unknown_phase",
            id: row.id,
          });
        }
      }
    }

    if (row.site_location_id !== null && row.site_location_id !== undefined) {
      await assertSiteLocationBelongsToSite(client, row.site_location_id, siteId);
    }
  }

  return normalized;
};

export const replaceJobLineItemsTx = async (
  client: PoolClient,
  jobId: string,
  siteId: string,
  rows: JobLineItemPatchRow[],
): Promise<void> => {
  const normalized = await validateLineItems(client, siteId, rows);

  await client.query(`DELETE FROM job_line WHERE job_id = $1`, [jobId]);

  for (const [index, row] of normalized.entries()) {
    const lineNumber = index + 1;
    const sortOrder = index + 1;

    await client.query(
      `INSERT INTO job_line (
         id,
         job_id,
         parent_line_id,
         line_number,
         line_role,
         line_kind,
         description,
         quantity,
         unit,
         unit_cost,
         unit_price,
         site_location_id,
         phase_id,
         item_id,
         part_id,
         vendor_part_id,
         estimate_line_id,
         change_order_line_id,
         source,
         status,
         superseded_by_job_line_id,
         sort_order
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
      [
        row.id,
        jobId,
        row.parent_line_id ?? null,
        lineNumber,
        row.line_role,
        row.line_kind,
        row.description,
        row.quantity,
        row.unit,
        row.unit_cost,
        row.unit_price,
        row.site_location_id ?? null,
        row.phase_id ?? null,
        row.item_id ?? null,
        row.part_id ?? null,
        row.vendor_part_id ?? null,
        row.estimate_line_id ?? null,
        row.change_order_line_id ?? null,
        row.source ?? "manual",
        row.status ?? "active",
        row.superseded_by_job_line_id ?? null,
        sortOrder,
      ],
    );
  }
};

export const replaceJobLineItems = async (
  pool: Pool,
  actorId: string,
  jobId: string,
  siteId: string,
  rows: JobLineItemPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceJobLineItemsTx(client, jobId, siteId, rows);
  });
};
