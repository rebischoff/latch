import { ConflictError } from "@latch/contracts";
import type { PoolClient } from "pg";

import { isMaterialUnlock } from "@/lib/catalog/material-phase-guard";
import { tableExists } from "@/lib/sites/repository/sql-utils";

/**
 * JML4: unlock blocked once any qty for this line's parts is on a PO line.
 * Returns whether the line has open (pre-PO) material demand for UI warn-confirm.
 */
export const assertMaterialUnlockAllowed = async (
  client: PoolClient,
  jobLineId: string,
  priorLocked: boolean | undefined,
  nextLocked: boolean | undefined,
): Promise<void> => {
  if (!isMaterialUnlock(priorLocked, nextLocked)) {
    return;
  }

  if (!(await tableExists(client, "purchase_order_line"))) {
    return;
  }

  const onPo = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM purchase_order_line pol
       WHERE pol.job_line_id = $1
          OR pol.job_line_part_id IN (
               SELECT id FROM job_line_part WHERE job_line_id = $1
             )
     ) AS exists`,
    [jobLineId],
  );

  if (onPo.rows[0]?.exists) {
    throw new ConflictError(
      "Cannot unlock material already on a purchase order",
      {
        field: "line_items",
        code: "part_on_purchase_order",
        job_line_id: jobLineId,
      },
    );
  }
};

/** Stub until task 63 live pool; prefer order cells when present (task 62). */
export const lineHasOpenMaterialDemand = async (
  client: PoolClient,
  jobLineId: string,
): Promise<boolean> => {
  if (await tableExists(client, "job_field_order_cell")) {
    const ordered = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM job_field_order_cell c
         INNER JOIN scope_phase sp ON sp.id = c.scope_phase_id
         WHERE sp.job_line_id = $1
           AND c.requested = true
       ) AS exists`,
      [jobLineId],
    );
    if (ordered.rows[0]?.exists) {
      return true;
    }
  }

  if (!(await tableExists(client, "job_material_request"))) {
    return false;
  }

  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM job_material_request jmr
       INNER JOIN job_line_part jlp ON jlp.id = jmr.job_line_part_id
       WHERE jlp.job_line_id = $1
         AND jmr.status <> 'fulfilled'
     ) AS exists`,
    [jobLineId],
  );
  return Boolean(result.rows[0]?.exists);
};
