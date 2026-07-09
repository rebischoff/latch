import type { Pool } from "pg";

import { scopePanelDefs } from "@/lib/catalog/repository/item-effective-specs";
import { tableExists } from "@/lib/sites/repository/sql-utils";

import type {
  EstimateScopeLaborPhaseRow,
  EstimateScopeRow,
  EstimateScopeSpecRow,
  EstimateScopeZoneRow,
} from "../descriptors/estimate-detail";

type EstimateScopeBaseRow = {
  complexity_factor_id: string | null;
  id: string;
  root_item_id: string;
  root_item_name: string | null;
  site_scope_id: string;
  site_scope_name: string | null;
  sort_order: number;
};

type EstimateZoneRow = {
  complexity_factor_id: string | null;
  estimate_scope_id: string;
  site_zone_id: string;
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
): Promise<Map<string, EstimateScopeSpecRow["options"]>> => {
  const optionsByDefId = new Map<string, EstimateScopeSpecRow["options"]>();

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

const loadSavedScopeSpecs = async (
  pool: Pool,
  scopeIds: string[],
): Promise<
  Array<{
    estimate_scope_id: string;
    option_display_name: string | null;
    spec_def_id: string;
    spec_option_id: string | null;
    value_boolean: boolean | null;
    value_number: number | null;
  }>
> => {
  if (scopeIds.length === 0) {
    return [];
  }

  const result = await pool.query<{
    estimate_scope_id: string;
    option_display_name: string | null;
    spec_def_id: string;
    spec_option_id: string | null;
    value_boolean: boolean | null;
    value_number: number | null;
  }>(
    `SELECT
       ess.estimate_scope_id,
       ess.spec_def_id,
       ess.spec_option_id,
       ess.value_number,
       ess.value_boolean,
       so.display_name AS option_display_name
     FROM estimate_scope_spec ess
     LEFT JOIN spec_option so ON so.id = ess.spec_option_id
     WHERE ess.estimate_scope_id = ANY($1::text[])`,
    [scopeIds],
  );

  return result.rows;
};

const mergeScopeSpecs = async (
  pool: Pool,
  scopes: EstimateScopeBaseRow[],
): Promise<Map<string, EstimateScopeSpecRow[]>> => {
  const scopedWithRoot = scopes.filter((scope) => scope.root_item_id !== null);
  if (scopedWithRoot.length === 0) {
    return new Map();
  }

  const panelDefsByRoot = new Map<string, Awaited<ReturnType<typeof scopePanelDefs>>>();
  for (const rootId of [
    ...new Set(scopedWithRoot.map((scope) => scope.root_item_id as string)),
  ]) {
    panelDefsByRoot.set(rootId, await scopePanelDefs(pool, rootId));
  }

  const scopeIds = scopedWithRoot.map((scope) => scope.id);
  const savedSpecs = await loadSavedScopeSpecs(pool, scopeIds);
  const savedByKey = new Map(
    savedSpecs.map((row) => [`${row.estimate_scope_id}:${row.spec_def_id}`, row]),
  );

  const defIds = [
    ...new Set(
      scopedWithRoot.flatMap((scope) =>
        (panelDefsByRoot.get(scope.root_item_id as string) ?? []).map(
          (def) => def.spec_def_id,
        ),
      ),
    ),
  ];
  const optionsByDefId = await loadSpecOptions(pool, defIds);

  const specsByScopeId = new Map<string, EstimateScopeSpecRow[]>();
  for (const scope of scopedWithRoot) {
    const panelDefs = panelDefsByRoot.get(scope.root_item_id as string) ?? [];
    specsByScopeId.set(
      scope.id,
      panelDefs.map((def) => {
        const saved = savedByKey.get(`${scope.id}:${def.spec_def_id}`);
        return {
          spec_def_id: def.spec_def_id,
          def_display_name: def.display_name,
          value_type: def.value_type,
          spec_option_id: saved?.spec_option_id ?? null,
          option_display_name: saved?.option_display_name ?? null,
          value_number: saved?.value_number ?? null,
          value_boolean: saved?.value_boolean ?? null,
          unit_symbol: def.unit_symbol,
          to_canonical_factor: def.to_canonical_factor,
          decimal_places: def.decimal_places,
          options: optionsByDefId.get(def.spec_def_id) ?? [],
        };
      }),
    );
  }

  return specsByScopeId;
};

const loadSavedZoneSpecs = async (
  pool: Pool,
  scopeIds: string[],
): Promise<
  Array<{
    estimate_scope_id: string;
    option_display_name: string | null;
    site_zone_id: string;
    spec_def_id: string;
    spec_option_id: string | null;
    value_boolean: boolean | null;
    value_number: number | null;
  }>
> => {
  if (scopeIds.length === 0) {
    return [];
  }

  const result = await pool.query<{
    estimate_scope_id: string;
    option_display_name: string | null;
    site_zone_id: string;
    spec_def_id: string;
    spec_option_id: string | null;
    value_boolean: boolean | null;
    value_number: number | null;
  }>(
    `SELECT
       ezs.estimate_scope_id,
       ezs.site_zone_id,
       ezs.spec_def_id,
       ezs.spec_option_id,
       ezs.value_number,
       ezs.value_boolean,
       so.display_name AS option_display_name
     FROM estimate_zone_spec ezs
     LEFT JOIN spec_option so ON so.id = ezs.spec_option_id
     WHERE ezs.estimate_scope_id = ANY($1::text[])`,
    [scopeIds],
  );

  return result.rows;
};

const mergeZoneSpecs = async (
  pool: Pool,
  scopes: EstimateScopeBaseRow[],
  zoneRows: EstimateZoneRow[],
): Promise<Map<string, EstimateScopeSpecRow[]>> => {
  if (zoneRows.length === 0) {
    return new Map();
  }

  const scopedWithRoot = scopes.filter((scope) => scope.root_item_id !== null);
  const scopeById = new Map(scopedWithRoot.map((scope) => [scope.id, scope]));

  const panelDefsByRoot = new Map<string, Awaited<ReturnType<typeof scopePanelDefs>>>();
  for (const rootId of [
    ...new Set(scopedWithRoot.map((scope) => scope.root_item_id as string)),
  ]) {
    panelDefsByRoot.set(rootId, await scopePanelDefs(pool, rootId));
  }

  const scopeIds = [...new Set(zoneRows.map((zone) => zone.estimate_scope_id))];
  const savedSpecs = await loadSavedZoneSpecs(pool, scopeIds);
  const savedByKey = new Map(
    savedSpecs.map((row) => [
      `${row.estimate_scope_id}:${row.site_zone_id}:${row.spec_def_id}`,
      row,
    ]),
  );

  const defIds = [
    ...new Set(
      scopedWithRoot.flatMap((scope) =>
        (panelDefsByRoot.get(scope.root_item_id as string) ?? []).map(
          (def) => def.spec_def_id,
        ),
      ),
    ),
  ];
  const optionsByDefId = await loadSpecOptions(pool, defIds);

  const specsByZoneKey = new Map<string, EstimateScopeSpecRow[]>();
  for (const zone of zoneRows) {
    const scope = scopeById.get(zone.estimate_scope_id);
    if (!scope?.root_item_id) {
      continue;
    }

    const panelDefs = panelDefsByRoot.get(scope.root_item_id) ?? [];
    const key = `${zone.estimate_scope_id}:${zone.site_zone_id}`;
    specsByZoneKey.set(
      key,
      panelDefs.map((def) => {
        const saved = savedByKey.get(`${zone.estimate_scope_id}:${zone.site_zone_id}:${def.spec_def_id}`);
        return {
          spec_def_id: def.spec_def_id,
          def_display_name: def.display_name,
          value_type: def.value_type,
          spec_option_id: saved?.spec_option_id ?? null,
          option_display_name: saved?.option_display_name ?? null,
          value_number: saved?.value_number ?? null,
          value_boolean: saved?.value_boolean ?? null,
          unit_symbol: def.unit_symbol,
          to_canonical_factor: def.to_canonical_factor,
          decimal_places: def.decimal_places,
          options: optionsByDefId.get(def.spec_def_id) ?? [],
        };
      }),
    );
  }

  return specsByZoneKey;
};

const loadScopeLaborPhasesByScopeId = async (
  pool: Pool,
  scopeIds: string[],
): Promise<Map<string, EstimateScopeLaborPhaseRow[]>> => {
  const byScopeId = new Map<string, EstimateScopeLaborPhaseRow[]>();
  if (scopeIds.length === 0 || !(await tableExists(pool, "estimate_scope_labor_phase"))) {
    return byScopeId;
  }

  const result = await pool.query<EstimateScopeLaborPhaseRow & { estimate_scope_id: string }>(
    `SELECT
       eslp.estimate_scope_id,
       eslp.labor_phase_id,
       lp.name AS labor_phase_name,
       eslp.sort_order
     FROM estimate_scope_labor_phase eslp
     INNER JOIN labor_phase lp ON lp.id = eslp.labor_phase_id
     WHERE eslp.estimate_scope_id = ANY($1::text[])
     ORDER BY eslp.sort_order ASC, lp.name ASC`,
    [scopeIds],
  );

  for (const row of result.rows) {
    const rows = byScopeId.get(row.estimate_scope_id) ?? [];
    rows.push({
      labor_phase_id: row.labor_phase_id,
      labor_phase_name: row.labor_phase_name,
      sort_order: row.sort_order,
    });
    byScopeId.set(row.estimate_scope_id, rows);
  }

  return byScopeId;
};

const loadZoneLaborPhasesByKey = async (
  pool: Pool,
  scopeIds: string[],
): Promise<Map<string, EstimateScopeLaborPhaseRow[]>> => {
  const byKey = new Map<string, EstimateScopeLaborPhaseRow[]>();
  if (scopeIds.length === 0 || !(await tableExists(pool, "estimate_zone_labor_phase"))) {
    return byKey;
  }

  const result = await pool.query<
    EstimateScopeLaborPhaseRow & { estimate_scope_id: string; site_zone_id: string }
  >(
    `SELECT
       ezlp.estimate_scope_id,
       ezlp.site_zone_id,
       ezlp.labor_phase_id,
       lp.name AS labor_phase_name,
       ezlp.sort_order
     FROM estimate_zone_labor_phase ezlp
     INNER JOIN labor_phase lp ON lp.id = ezlp.labor_phase_id
     WHERE ezlp.estimate_scope_id = ANY($1::text[])
     ORDER BY ezlp.sort_order ASC, lp.name ASC`,
    [scopeIds],
  );

  for (const row of result.rows) {
    const key = `${row.estimate_scope_id}:${row.site_zone_id}`;
    const rows = byKey.get(key) ?? [];
    rows.push({
      labor_phase_id: row.labor_phase_id,
      labor_phase_name: row.labor_phase_name,
      sort_order: row.sort_order,
    });
    byKey.set(key, rows);
  }

  return byKey;
};

export const loadEstimateScopes = async (
  pool: Pool,
  estimateId: string,
): Promise<EstimateScopeRow[]> => {
  const scopesResult = await pool.query<EstimateScopeBaseRow>(
    `SELECT
       es.id,
       es.site_scope_id,
       ss.name AS site_scope_name,
       es.root_item_id,
       c.name AS root_item_name,
       es.sort_order,
       es.complexity_factor_id
     FROM estimate_scope es
     LEFT JOIN site_scope ss ON ss.id = es.site_scope_id
     LEFT JOIN item c ON c.id = es.root_item_id
     WHERE es.estimate_id = $1
     ORDER BY es.sort_order ASC, es.id ASC`,
    [estimateId],
  );

  if (scopesResult.rows.length === 0) {
    return [];
  }

  const scopeIds = scopesResult.rows.map((scope) => scope.id);

  const [scopeSpecsByScopeId, zoneRowsResult, scopeLaborByScopeId, zoneLaborByKey] =
    await Promise.all([
      mergeScopeSpecs(pool, scopesResult.rows),
      pool.query<EstimateZoneRow>(
        `SELECT estimate_scope_id, site_zone_id, sort_order, complexity_factor_id
       FROM estimate_zone
       WHERE estimate_scope_id = ANY($1::text[])
       ORDER BY sort_order ASC, site_zone_id ASC`,
        [scopeIds],
      ),
      loadScopeLaborPhasesByScopeId(pool, scopeIds),
      loadZoneLaborPhasesByKey(pool, scopeIds),
    ]);
  const zoneSpecsByKey = await mergeZoneSpecs(
    pool,
    scopesResult.rows,
    zoneRowsResult.rows,
  );

  const zonesByScopeId = new Map<string, EstimateScopeZoneRow[]>();
  for (const zone of zoneRowsResult.rows) {
    const zones = zonesByScopeId.get(zone.estimate_scope_id) ?? [];
    const specKey = `${zone.estimate_scope_id}:${zone.site_zone_id}`;
    zones.push({
      site_zone_id: zone.site_zone_id,
      sort_order: zone.sort_order,
      complexity_factor_id: zone.complexity_factor_id,
      included_labor_phases: zoneLaborByKey.get(specKey) ?? [],
      specs: zoneSpecsByKey.get(specKey) ?? [],
    });
    zonesByScopeId.set(zone.estimate_scope_id, zones);
  }

  return scopesResult.rows.map((scope) => ({
    ...scope,
    included_labor_phases: scopeLaborByScopeId.get(scope.id) ?? [],
    specs: scopeSpecsByScopeId.get(scope.id) ?? [],
    zones: zonesByScopeId.get(scope.id) ?? [],
  }));
};
