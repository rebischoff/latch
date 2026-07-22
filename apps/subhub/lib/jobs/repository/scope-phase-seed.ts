import type { Pool, PoolClient } from "pg";

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
  /** Post-win engineer adds seed phases from the job condition forest (task 46 Step 4). */
  job_condition_id?: string | null;
  item_id: string | null;
  job_line_id: string;
  quantity: number;
  site_zone_id: string | null;
};

export type JobLineMaterialPhaseOption = {
  hours_per_unit: number;
  labor_phase_id: string;
  labor_phase_name: string;
};

type Queryable = Pool | PoolClient;

/** Job-condition variant of `loadConditionLaborPhases` (walks `job_condition*`). */
const loadJobConditionLaborPhases = async (
  client: Queryable,
  jobConditionId: string,
): Promise<string[] | null> => {
  if (!(await tableExists(client, "job_condition_labor_phase"))) {
    return null;
  }

  let current: string | null = jobConditionId;
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current)) {
      break;
    }
    seen.add(current);

    const metaResult: {
      rows: Array<{
        labor_phases_explicit: boolean;
        parent_condition_id: string | null;
      }>;
    } = await client.query(
      `SELECT labor_phases_explicit, parent_condition_id
       FROM job_condition WHERE id = $1`,
      [current],
    );
    const meta = metaResult.rows[0];
    if (!meta) {
      break;
    }

    if (meta.labor_phases_explicit) {
      const result = await client.query<{ labor_phase_id: string }>(
        `SELECT labor_phase_id
         FROM job_condition_labor_phase
         WHERE job_condition_id = $1
         ORDER BY sort_order ASC, labor_phase_id ASC`,
        [current],
      );
      return result.rows.map((row) => row.labor_phase_id);
    }

    current = meta.parent_condition_id;
  }

  return null;
};

/**
 * Phases that would be (or were) seeded for a job line — item labor group ∩
 * condition inclusion. Used by seed and by Mat. phase option fallback when
 * `scope_phase` was never created (e.g. catalog labor added after win).
 */
export const resolveJobLineMaterialPhaseOptions = async (
  client: Queryable,
  input: {
    estimate_condition_id?: string | null;
    item_id: string | null;
    job_condition_id?: string | null;
  },
): Promise<JobLineMaterialPhaseOption[]> => {
  const conditionId = input.estimate_condition_id ?? null;
  const jobConditionId = input.job_condition_id ?? null;
  if (!input.item_id || (!conditionId && !jobConditionId)) {
    return [];
  }

  const catalog = await loadCommercialCatalog(client);
  const laborGroup = resolveLaborGroup(catalog, input.item_id);
  if (laborGroup.length === 0) {
    return [];
  }

  const conditionPhases = jobConditionId
    ? await loadJobConditionLaborPhases(client, jobConditionId)
    : await loadConditionLaborPhases(client, conditionId!);
  const included = resolveIncludedLaborPhaseIds(conditionPhases, laborGroup);
  const filtered = filterLaborGroupByInclusion(laborGroup, included);
  if (filtered.length === 0) {
    return [];
  }

  const phaseNames = await client.query<{ id: string; name: string }>(
    `SELECT id, name FROM labor_phase WHERE id = ANY($1::text[])`,
    [filtered.map((row) => row.labor_phase_id)],
  );
  const nameById = new Map(phaseNames.rows.map((row) => [row.id, row.name]));

  return filtered.map((row) => ({
    labor_phase_id: row.labor_phase_id,
    labor_phase_name: nameById.get(row.labor_phase_id) ?? row.labor_phase_id,
    hours_per_unit: Number(row.hours_per_unit),
  }));
};

export const seedScopePhasesForJobLineTx = async (
  client: PoolClient,
  input: SeedScopePhaseInput,
): Promise<void> => {
  if (!(await tableExists(client, "scope_phase")) || !input.item_id) {
    return;
  }

  const existing = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM scope_phase WHERE job_line_id = $1`,
    [input.job_line_id],
  );
  if ((existing.rows[0]?.count ?? 0) > 0) {
    return;
  }

  const options = await resolveJobLineMaterialPhaseOptions(client, input);
  if (options.length === 0) {
    return;
  }

  for (const [index, row] of options.entries()) {
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
        row.labor_phase_name,
        index + 1,
        input.quantity,
        row.hours_per_unit,
        row.hours_per_unit,
        index + 1,
      ],
    );
  }
};
