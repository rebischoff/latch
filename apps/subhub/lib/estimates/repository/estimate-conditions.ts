import type { Pool } from "pg";

import { scopePanelDefs } from "@/lib/catalog/repository/item-effective-specs";
import { tableExists } from "@/lib/sites/repository/sql-utils";

import type {
  EstimateConditionLaborPhaseRow,
  EstimateConditionRow,
  EstimateConditionSpecRow,
} from "../descriptors/estimate-detail";

type EstimateConditionBaseRow = {
  complexity_factor_id: string | null;
  id: string;
  include_discontinued: boolean;
  labor_phases_explicit: boolean;
  name: string;
  parent_condition_id: string | null;
  root_item_id: string | null;
  root_item_name: string | null;
  sort_order: number;
};

type SpecOptionQueryRow = {
  display_name: string;
  id: string;
  spec_def_id: string;
};

const loadSpecOptions = async (
  pool: Pool,
  defIds: string[],
): Promise<Map<string, EstimateConditionSpecRow["options"]>> => {
  const optionsByDefId = new Map<string, EstimateConditionSpecRow["options"]>();

  if (defIds.length === 0) {
    return optionsByDefId;
  }

  const optionsResult = await pool.query<SpecOptionQueryRow>(
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
    estimate_condition_id: string;
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
    estimate_condition_id: string;
    option_display_name: string | null;
    spec_def_id: string;
    spec_option_id: string | null;
    value_boolean: boolean | null;
    value_number: number | null;
    value_number_max: number | null;
  }>(
    `SELECT
       ecs.estimate_condition_id,
       ecs.spec_def_id,
       ecs.spec_option_id,
       ecs.value_number,
       ecs.value_number_max,
       ecs.value_boolean,
       so.display_name AS option_display_name
     FROM estimate_condition_spec ecs
     LEFT JOIN spec_option so ON so.id = ecs.spec_option_id
     WHERE ecs.estimate_condition_id = ANY($1::text[])`,
    [conditionIds],
  );

  return result.rows;
};

/** Resolve tree root_item_id for each condition (children inherit from root). */
const resolveRootItemIds = (
  rows: EstimateConditionBaseRow[],
): Map<string, string> => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const rootItemById = new Map<string, string>();

  for (const row of rows) {
    if (row.parent_condition_id === null && row.root_item_id) {
      rootItemById.set(row.id, row.root_item_id);
      continue;
    }

    let current: EstimateConditionBaseRow | undefined = row;
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
  conditionRows: EstimateConditionBaseRow[],
  rootItemByConditionId: Map<string, string>,
): Promise<Map<string, EstimateConditionSpecRow[]>> => {
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
    savedSpecs.map((row) => [`${row.estimate_condition_id}:${row.spec_def_id}`, row]),
  );

  const defIds = [
    ...new Set(
      rootIds.flatMap((rootId) =>
        (panelDefsByRoot.get(rootId) ?? []).map((def) => def.spec_def_id),
      ),
    ),
  ];
  const optionsByDefId = await loadSpecOptions(pool, defIds);

  const specsByConditionId = new Map<string, EstimateConditionSpecRow[]>();
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
): Promise<Map<string, EstimateConditionLaborPhaseRow[]>> => {
  const byId = new Map<string, EstimateConditionLaborPhaseRow[]>();
  if (
    conditionIds.length === 0 ||
    !(await tableExists(pool, "estimate_condition_labor_phase"))
  ) {
    return byId;
  }

  const result = await pool.query<
    EstimateConditionLaborPhaseRow & { estimate_condition_id: string }
  >(
    `SELECT
       eclp.estimate_condition_id,
       eclp.labor_phase_id,
       lp.name AS labor_phase_name,
       eclp.sort_order
     FROM estimate_condition_labor_phase eclp
     INNER JOIN labor_phase lp ON lp.id = eclp.labor_phase_id
     WHERE eclp.estimate_condition_id = ANY($1::text[])
     ORDER BY eclp.sort_order ASC, lp.name ASC`,
    [conditionIds],
  );

  for (const row of result.rows) {
    const rows = byId.get(row.estimate_condition_id) ?? [];
    rows.push({
      labor_phase_id: row.labor_phase_id,
      labor_phase_name: row.labor_phase_name,
      sort_order: row.sort_order,
    });
    byId.set(row.estimate_condition_id, rows);
  }

  return byId;
};

const buildConditionTree = (
  flat: EstimateConditionBaseRow[],
  specsByConditionId: Map<string, EstimateConditionSpecRow[]>,
  laborByConditionId: Map<string, EstimateConditionLaborPhaseRow[]>,
): EstimateConditionRow[] => {
  const byId = new Map<string, EstimateConditionRow>();

  for (const row of flat) {
    byId.set(row.id, {
      id: row.id,
      name: row.name,
      parent_condition_id: row.parent_condition_id,
      root_item_id: row.root_item_id,
      root_item_name: row.root_item_name,
      sort_order: row.sort_order,
      complexity_factor_id: row.complexity_factor_id,
      include_discontinued: row.include_discontinued,
      labor_phases_explicit: row.labor_phases_explicit,
      included_labor_phases: laborByConditionId.get(row.id) ?? [],
      specs: specsByConditionId.get(row.id) ?? [],
      conditions: [],
    });
  }

  const roots: EstimateConditionRow[] = [];
  for (const row of flat) {
    const node = byId.get(row.id)!;
    if (row.parent_condition_id && byId.has(row.parent_condition_id)) {
      byId.get(row.parent_condition_id)!.conditions.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: EstimateConditionRow[]): void => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
    for (const node of nodes) {
      sortRecursive(node.conditions);
    }
  };
  sortRecursive(roots);

  return roots;
};

export const loadEstimateConditions = async (
  pool: Pool,
  estimateId: string,
): Promise<EstimateConditionRow[]> => {
  const conditionsResult = await pool.query<EstimateConditionBaseRow>(
    `SELECT
       ec.id,
       ec.name,
       ec.parent_condition_id,
       ec.root_item_id,
       i.name AS root_item_name,
       ec.sort_order,
       ec.complexity_factor_id,
       ec.include_discontinued,
       ec.labor_phases_explicit
     FROM estimate_condition ec
     LEFT JOIN item i ON i.id = ec.root_item_id
     WHERE ec.estimate_id = $1
     ORDER BY ec.sort_order ASC, ec.id ASC`,
    [estimateId],
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

/** @deprecated Use loadEstimateConditions. */
export const loadEstimateScopes = loadEstimateConditions;
