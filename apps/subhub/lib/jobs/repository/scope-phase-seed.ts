import type { PoolClient } from "pg";

import {
  filterLaborGroupByInclusion,
  loadCommercialCatalog,
  loadConditionLaborPhases,
  resolveIncludedLaborPhaseIds,
  resolveLaborGroup,
} from "../../estimates/repository/estimate-commercial";
import { tableExists } from "../../sites/repository/sql-utils";

export type SeedScopePhaseInput = {
  /** @deprecated Prefer estimate_condition_id (37y). */
  estimate_scope_id?: string | null;
  estimate_condition_id: string | null;
  item_id: string | null;
  job_line_id: string;
  quantity: number;
  site_zone_id: string | null;
};

export const seedScopePhasesForJobLineTx = async (
  client: PoolClient,
  input: SeedScopePhaseInput,
): Promise<void> => {
  const conditionId = input.estimate_condition_id;
  if (!(await tableExists(client, "scope_phase")) || !input.item_id || !conditionId) {
    return;
  }

  const existing = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM scope_phase WHERE job_line_id = $1`,
    [input.job_line_id],
  );
  if ((existing.rows[0]?.count ?? 0) > 0) {
    return;
  }

  const catalog = await loadCommercialCatalog(client);
  const laborGroup = resolveLaborGroup(catalog, input.item_id);
  if (laborGroup.length === 0) {
    return;
  }

  // 37x X4 / 37y: win→job condition handoff still deferred — seed from condition phases.
  const conditionPhases = await loadConditionLaborPhases(client, conditionId);
  const included = resolveIncludedLaborPhaseIds(conditionPhases, laborGroup);
  const filtered = filterLaborGroupByInclusion(laborGroup, included);
  if (filtered.length === 0) {
    return;
  }

  const phaseNames = await client.query<{ id: string; name: string }>(
    `SELECT id, name FROM labor_phase WHERE id = ANY($1::text[])`,
    [filtered.map((row) => row.labor_phase_id)],
  );
  const nameById = new Map(phaseNames.rows.map((row) => [row.id, row.name]));

  for (const [index, row] of filtered.entries()) {
    await client.query(
      `INSERT INTO scope_phase (
         job_line_id,
         labor_phase_id,
         name,
         sequence,
         planned_qty,
         progress_weight,
         billing_weight,
         sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.job_line_id,
        row.labor_phase_id,
        nameById.get(row.labor_phase_id) ?? row.labor_phase_id,
        index + 1,
        input.quantity,
        Number(row.hours_per_unit),
        Number(row.hours_per_unit),
        index + 1,
      ],
    );
  }
};
