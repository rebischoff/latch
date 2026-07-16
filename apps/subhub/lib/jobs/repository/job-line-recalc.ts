import type { Pool, PoolClient } from "pg";

import {
  computeAddOnUnit,
  computeUnitPriceTarget,
  loadCommercialCatalog,
  resolveComplexityPercent,
  resolveFilteredLaborCost,
  resolveRate,
  type CommercialCatalog,
  type ComplexityContext,
  type CostAddOnProfile,
  type MarkupProfile,
} from "@/lib/estimates/repository/estimate-commercial";
import { tableExists } from "@/lib/sites/repository/sql-utils";

import type { JobLineItemPatchRow } from "../descriptors/job-detail";

export type JobRecalcLineInput = JobLineItemPatchRow & { id: string };

export type JobRecalcLineOutput = JobRecalcLineInput & {
  unit_material: number;
  unit_labor: number;
  unit_freight: number;
  unit_incidental: number;
  unit_cost: number;
  unit_price_target: number;
  unit_price: number;
};

/** Nearest explicit labor-phase override walking a job condition leaf → root. */
const loadJobConditionLaborPhases = async (
  client: Pool | PoolClient,
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

/** Nearest non-null complexity factor walking a job condition leaf → root. */
const loadJobComplexityContext = async (
  client: Pool | PoolClient,
  jobConditionId: string | null,
): Promise<ComplexityContext> => {
  if (!jobConditionId) {
    return { condition_factor_percent: null };
  }

  let current: string | null = jobConditionId;
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current)) {
      break;
    }
    seen.add(current);

    const factorResult: {
      rows: Array<{
        factor_percent: number | null;
        parent_condition_id: string | null;
      }>;
    } = await client.query(
      `SELECT cf.factor_percent, jc.parent_condition_id
       FROM job_condition jc
       LEFT JOIN complexity_factor cf ON cf.id = jc.complexity_factor_id
       WHERE jc.id = $1`,
      [current],
    );
    const row = factorResult.rows[0];
    if (!row) {
      break;
    }
    if (row.factor_percent !== null && row.factor_percent !== undefined) {
      return { condition_factor_percent: Number(row.factor_percent) };
    }
    current = row.parent_condition_id;
  }

  return { condition_factor_percent: null };
};

/**
 * Recompute a job line's **live** cost buckets from its job condition (labor
 * phases + complexity) and the shared commercial catalog. Material is taken from
 * the client input (engineering BOM / part). Sold snapshot columns are never
 * touched here (task 46 Scope-F1) — the write path preserves them separately.
 */
export const recalcJobProductLine = async (
  client: Pool | PoolClient,
  line: JobRecalcLineInput,
  catalog?: CommercialCatalog,
): Promise<JobRecalcLineOutput> => {
  const salesLocked = line.sales_locked ?? false;
  const unitMaterialInput = Number(line.unit_material ?? 0);

  if (!line.item_id) {
    const unitCost = Number(line.unit_cost ?? unitMaterialInput);
    return {
      ...line,
      unit_material: unitMaterialInput,
      unit_labor: 0,
      unit_freight: 0,
      unit_incidental: 0,
      unit_cost: unitCost,
      unit_price_target: unitCost,
      unit_price: salesLocked ? Number(line.unit_price ?? 0) : unitCost,
    };
  }

  const commercialCatalog = catalog ?? (await loadCommercialCatalog(client));
  const jobConditionId = line.job_condition_id ?? null;

  const [laborPhases, complexity] = await Promise.all([
    jobConditionId
      ? loadJobConditionLaborPhases(client, jobConditionId)
      : Promise.resolve(null),
    loadJobComplexityContext(client, jobConditionId),
  ]);

  const baseLabor = resolveFilteredLaborCost(
    commercialCatalog,
    line.item_id,
    laborPhases,
  );
  const complexityPercent = resolveComplexityPercent(complexity);
  const unitLabor = baseLabor * (complexityPercent / 100);

  const unitMaterial = unitMaterialInput;
  const freightProfile = resolveRate(
    commercialCatalog,
    line.item_id,
    "freight",
  ) as CostAddOnProfile | null;
  const incidentalProfile = resolveRate(
    commercialCatalog,
    line.item_id,
    "incidental",
  ) as CostAddOnProfile | null;
  const unitFreight = computeAddOnUnit(freightProfile, unitMaterial);
  const unitIncidental = computeAddOnUnit(incidentalProfile, unitMaterial);

  const unitCost = unitMaterial + unitLabor + unitFreight + unitIncidental;
  const markup = resolveRate(
    commercialCatalog,
    line.item_id,
    "markup",
  ) as MarkupProfile | null;
  const unitPriceTarget = computeUnitPriceTarget(
    unitMaterial,
    unitLabor,
    unitFreight,
    unitIncidental,
    markup,
  );

  return {
    ...line,
    unit_material: unitMaterial,
    unit_labor: unitLabor,
    unit_freight: unitFreight,
    unit_incidental: unitIncidental,
    unit_cost: unitCost,
    unit_price_target: unitPriceTarget,
    unit_price: salesLocked ? Number(line.unit_price ?? 0) : unitPriceTarget,
  };
};

export const recalcJobLineItems = async (
  client: Pool | PoolClient,
  lines: JobRecalcLineInput[],
): Promise<JobRecalcLineOutput[]> => {
  const catalog = await loadCommercialCatalog(client);
  const out: JobRecalcLineOutput[] = [];
  for (const line of lines) {
    out.push(await recalcJobProductLine(client, line, catalog));
  }
  return out;
};
