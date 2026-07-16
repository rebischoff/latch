import type { Pool } from "pg";

import { scopePanelDefs } from "@/lib/catalog/repository/item-effective-specs";
import { tableExists } from "@/lib/sites/repository/sql-utils";

import type {
  JobConditionLaborPhaseRow,
  JobConditionRow,
  JobConditionSpecRow,
} from "../descriptors/job-detail";

type JobConditionBaseRow = {
  complexity_factor_id: string | null;
  complexity_factor_id_at_win: string | null;
  id: string;
  include_discontinued: boolean;
  include_discontinued_explicit: boolean;
  labor_only: boolean;
  labor_only_explicit: boolean;
  labor_phases_explicit: boolean;
  name: string;
  parent_condition_id: string | null;
  root_item_id: string | null;
  root_item_name: string | null;
  site_zone_id: string | null;
  site_zone_name: string | null;
  sort_order: number;
};

const loadSpecOptions = async (
  pool: Pool,
  defIds: string[],
): Promise<Map<string, JobConditionSpecRow["options"]>> => {
  const optionsByDefId = new Map<string, JobConditionSpecRow["options"]>();
  if (defIds.length === 0) {
    return optionsByDefId;
  }

  const optionsResult = await pool.query<{
    display_name: string;
    id: string;
    spec_def_id: string;
  }>(
    `SELECT id, spec_def_id, display_name
     FROM spec_option
     WHERE spec_def_id = ANY($1::uuid[])
     ORDER BY sort_order ASC, id ASC`,
    [defIds],
  );

  for (const option of optionsResult.rows) {
    const options = optionsByDefId.get(option.spec_def_id) ?? [];
    options.push({ id: option.id, display_name: option.display_name });
    optionsByDefId.set(option.spec_def_id, options);
  }

  return optionsByDefId;
};

const loadSavedConditionSpecs = async (
  pool: Pool,
  conditionIds: string[],
): Promise<
  Array<{
    job_condition_id: string;
    option_display_name: string | null;
    spec_def_id: string;
    spec_option_id: string | null;
    value_boolean: boolean | null;
    value_number: number | null;
    value_number_max: number | null;
  }>
> => {
  if (conditionIds.length === 0) {
    return [];
  }

  const result = await pool.query<{
    job_condition_id: string;
    option_display_name: string | null;
    spec_def_id: string;
    spec_option_id: string | null;
    value_boolean: boolean | null;
    value_number: number | null;
    value_number_max: number | null;
  }>(
    `SELECT
       jcs.job_condition_id,
       jcs.spec_def_id,
       jcs.spec_option_id,
       jcs.value_number,
       jcs.value_number_max,
       jcs.value_boolean,
       so.display_name AS option_display_name
     FROM job_condition_spec jcs
     LEFT JOIN spec_option so ON so.id = jcs.spec_option_id
     WHERE jcs.job_condition_id = ANY($1::text[])`,
    [conditionIds],
  );

  return result.rows;
};

const resolveRootItemIds = (
  rows: JobConditionBaseRow[],
): Map<string, string> => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const rootItemById = new Map<string, string>();

  for (const row of rows) {
    let current: JobConditionBaseRow | undefined = row;
    const seen = new Set<string>();
    while (current) {
      if (seen.has(current.id)) {
        break;
      }
      seen.add(current.id);
      if (current.parent_condition_id === null && current.root_item_id) {
        rootItemById.set(row.id, current.root_item_id);
        break;
      }
      current = current.parent_condition_id
        ? byId.get(current.parent_condition_id)
        : undefined;
    }
  }

  return rootItemById;
};

const mergeConditionSpecs = async (
  pool: Pool,
  conditionRows: JobConditionBaseRow[],
  rootItemByConditionId: Map<string, string>,
): Promise<Map<string, JobConditionSpecRow[]>> => {
  if (conditionRows.length === 0) {
    return new Map();
  }

  const rootIds = [...new Set([...rootItemByConditionId.values()])];
  const panelDefsByRoot = new Map<string, Awaited<ReturnType<typeof scopePanelDefs>>>();
  for (const rootId of rootIds) {
    panelDefsByRoot.set(rootId, await scopePanelDefs(pool, rootId));
  }

  const conditionIds = conditionRows.map((row) => row.id);
  const savedSpecs = await loadSavedConditionSpecs(pool, conditionIds);
  const savedByKey = new Map(
    savedSpecs.map((row) => [`${row.job_condition_id}:${row.spec_def_id}`, row]),
  );

  const defIds = [
    ...new Set(
      rootIds.flatMap((rootId) =>
        (panelDefsByRoot.get(rootId) ?? []).map((def) => def.spec_def_id),
      ),
    ),
  ];
  const optionsByDefId = await loadSpecOptions(pool, defIds);

  const specsByConditionId = new Map<string, JobConditionSpecRow[]>();
  for (const condition of conditionRows) {
    const rootItemId = rootItemByConditionId.get(condition.id);
    if (!rootItemId) {
      continue;
    }

    const panelDefs = panelDefsByRoot.get(rootItemId) ?? [];
    specsByConditionId.set(
      condition.id,
      panelDefs.map((def) => {
        const saved = savedByKey.get(`${condition.id}:${def.spec_def_id}`);
        return {
          spec_def_id: def.spec_def_id,
          def_display_name: def.display_name,
          value_type: def.value_type,
          spec_option_id: saved?.spec_option_id ?? null,
          option_display_name: saved?.option_display_name ?? null,
          value_number: saved?.value_number ?? null,
          value_number_max: saved?.value_number_max ?? null,
          value_boolean: saved?.value_boolean ?? null,
          unit_symbol: def.unit_symbol,
          to_canonical_factor: def.to_canonical_factor,
          decimal_places: def.decimal_places,
          options: optionsByDefId.get(def.spec_def_id) ?? [],
        };
      }),
    );
  }

  return specsByConditionId;
};

const loadConditionLaborPhasesById = async (
  pool: Pool,
  conditionIds: string[],
): Promise<Map<string, JobConditionLaborPhaseRow[]>> => {
  const byId = new Map<string, JobConditionLaborPhaseRow[]>();
  if (
    conditionIds.length === 0 ||
    !(await tableExists(pool, "job_condition_labor_phase"))
  ) {
    return byId;
  }

  const result = await pool.query<
    JobConditionLaborPhaseRow & { job_condition_id: string }
  >(
    `SELECT
       jclp.job_condition_id,
       jclp.labor_phase_id,
       lp.name AS labor_phase_name,
       jclp.sort_order
     FROM job_condition_labor_phase jclp
     INNER JOIN labor_phase lp ON lp.id = jclp.labor_phase_id
     WHERE jclp.job_condition_id = ANY($1::text[])
     ORDER BY jclp.sort_order ASC, lp.name ASC`,
    [conditionIds],
  );

  for (const row of result.rows) {
    const rows = byId.get(row.job_condition_id) ?? [];
    rows.push({
      labor_phase_id: row.labor_phase_id,
      labor_phase_name: row.labor_phase_name,
      sort_order: row.sort_order,
    });
    byId.set(row.job_condition_id, rows);
  }

  return byId;
};

const buildConditionTree = (
  flat: JobConditionBaseRow[],
  specsByConditionId: Map<string, JobConditionSpecRow[]>,
  laborByConditionId: Map<string, JobConditionLaborPhaseRow[]>,
): JobConditionRow[] => {
  const byId = new Map<string, JobConditionRow>();

  for (const row of flat) {
    byId.set(row.id, {
      id: row.id,
      name: row.name,
      parent_condition_id: row.parent_condition_id,
      site_zone_id: row.site_zone_id,
      site_zone_name: row.site_zone_name,
      root_item_id: row.root_item_id,
      root_item_name: row.root_item_name,
      sort_order: row.sort_order,
      complexity_factor_id: row.complexity_factor_id,
      complexity_factor_id_at_win: row.complexity_factor_id_at_win,
      include_discontinued: row.include_discontinued,
      include_discontinued_explicit: row.include_discontinued_explicit,
      labor_only: row.labor_only,
      labor_only_explicit: row.labor_only_explicit,
      labor_phases_explicit: row.labor_phases_explicit,
      included_labor_phases: laborByConditionId.get(row.id) ?? [],
      specs: specsByConditionId.get(row.id) ?? [],
      conditions: [],
    });
  }

  const roots: JobConditionRow[] = [];
  for (const row of flat) {
    const node = byId.get(row.id)!;
    if (row.parent_condition_id && byId.has(row.parent_condition_id)) {
      byId.get(row.parent_condition_id)!.conditions.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: JobConditionRow[]): void => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
    for (const node of nodes) {
      sortRecursive(node.conditions);
    }
  };
  sortRecursive(roots);

  return roots;
};

export const loadJobConditions = async (
  pool: Pool,
  jobId: string,
): Promise<JobConditionRow[]> => {
  if (!(await tableExists(pool, "job_condition"))) {
    return [];
  }

  const conditionsResult = await pool.query<JobConditionBaseRow>(
    `SELECT
       jc.id,
       jc.name,
       jc.parent_condition_id,
       jc.site_zone_id,
       sz.name AS site_zone_name,
       sz.root_item_id,
       i.name AS root_item_name,
       jc.sort_order,
       jc.complexity_factor_id,
       jc.complexity_factor_id_at_win,
       jc.include_discontinued,
       jc.include_discontinued_explicit,
       jc.labor_only,
       jc.labor_only_explicit,
       jc.labor_phases_explicit
     FROM job_condition jc
     LEFT JOIN site_zone sz ON sz.id = jc.site_zone_id
     LEFT JOIN item i ON i.id = sz.root_item_id
     WHERE jc.job_id = $1
     ORDER BY jc.sort_order ASC, jc.id ASC`,
    [jobId],
  );

  if (conditionsResult.rows.length === 0) {
    return [];
  }

  const rootItemByConditionId = resolveRootItemIds(conditionsResult.rows);
  const conditionIds = conditionsResult.rows.map((row) => row.id);

  const [specsByConditionId, laborByConditionId] = await Promise.all([
    mergeConditionSpecs(pool, conditionsResult.rows, rootItemByConditionId),
    loadConditionLaborPhasesById(pool, conditionIds),
  ]);

  return buildConditionTree(
    conditionsResult.rows,
    specsByConditionId,
    laborByConditionId,
  );
};
