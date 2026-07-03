import type { Pool } from "pg";

import { scopePanelDefs } from "@/lib/catalog/repository/category-effective-specs";

import type {
  EstimateScopeRow,
  EstimateScopeSpecRow,
  EstimateScopeZoneRow,
} from "../descriptors/estimate-detail";

type EstimateScopeBaseRow = {
  id: string;
  labor_context_type_id: string | null;
  markup_type_id: string | null;
  root_category_id: string | null;
  root_category_name: string | null;
  site_scope_id: string | null;
  site_scope_name: string | null;
  sort_order: number;
};

type EstimateZoneRow = {
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
    value_text: string | null;
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
    value_text: string | null;
  }>(
    `SELECT
       ess.estimate_scope_id,
       ess.spec_def_id,
       ess.spec_option_id,
       ess.value_text,
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
  const scopedWithRoot = scopes.filter((scope) => scope.root_category_id !== null);
  if (scopedWithRoot.length === 0) {
    return new Map();
  }

  const panelDefsByRoot = new Map<string, Awaited<ReturnType<typeof scopePanelDefs>>>();
  for (const rootId of [
    ...new Set(scopedWithRoot.map((scope) => scope.root_category_id as string)),
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
        (panelDefsByRoot.get(scope.root_category_id as string) ?? []).map(
          (def) => def.spec_def_id,
        ),
      ),
    ),
  ];
  const optionsByDefId = await loadSpecOptions(pool, defIds);

  const specsByScopeId = new Map<string, EstimateScopeSpecRow[]>();
  for (const scope of scopedWithRoot) {
    const panelDefs = panelDefsByRoot.get(scope.root_category_id as string) ?? [];
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
          value_text: saved?.value_text ?? null,
          value_boolean: saved?.value_boolean ?? null,
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
    value_text: string | null;
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
    value_text: string | null;
  }>(
    `SELECT
       ezs.estimate_scope_id,
       ezs.site_zone_id,
       ezs.spec_def_id,
       ezs.spec_option_id,
       ezs.value_text,
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

  const scopedWithRoot = scopes.filter((scope) => scope.root_category_id !== null);
  const scopeById = new Map(scopedWithRoot.map((scope) => [scope.id, scope]));

  const panelDefsByRoot = new Map<string, Awaited<ReturnType<typeof scopePanelDefs>>>();
  for (const rootId of [
    ...new Set(scopedWithRoot.map((scope) => scope.root_category_id as string)),
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
        (panelDefsByRoot.get(scope.root_category_id as string) ?? []).map(
          (def) => def.spec_def_id,
        ),
      ),
    ),
  ];
  const optionsByDefId = await loadSpecOptions(pool, defIds);

  const specsByZoneKey = new Map<string, EstimateScopeSpecRow[]>();
  for (const zone of zoneRows) {
    const scope = scopeById.get(zone.estimate_scope_id);
    if (!scope?.root_category_id) {
      continue;
    }

    const panelDefs = panelDefsByRoot.get(scope.root_category_id) ?? [];
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
          value_text: saved?.value_text ?? null,
          value_boolean: saved?.value_boolean ?? null,
          options: optionsByDefId.get(def.spec_def_id) ?? [],
        };
      }),
    );
  }

  return specsByZoneKey;
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
       es.root_category_id,
       c.name AS root_category_name,
       es.sort_order,
       es.labor_context_type_id,
       es.markup_type_id
     FROM estimate_scope es
     LEFT JOIN site_scope ss ON ss.id = es.site_scope_id
     LEFT JOIN category c ON c.id = es.root_category_id
     WHERE es.estimate_id = $1
     ORDER BY es.sort_order ASC, es.id ASC`,
    [estimateId],
  );

  if (scopesResult.rows.length === 0) {
    return [];
  }

  const scopeIds = scopesResult.rows.map((scope) => scope.id);

  const [scopeSpecsByScopeId, zoneRowsResult] = await Promise.all([
    mergeScopeSpecs(pool, scopesResult.rows),
    pool.query<EstimateZoneRow>(
      `SELECT estimate_scope_id, site_zone_id, sort_order
       FROM estimate_zone
       WHERE estimate_scope_id = ANY($1::text[])
       ORDER BY sort_order ASC, site_zone_id ASC`,
      [scopeIds],
    ),
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
      specs: zoneSpecsByKey.get(specKey) ?? [],
    });
    zonesByScopeId.set(zone.estimate_scope_id, zones);
  }

  return scopesResult.rows.map((scope) => ({
    ...scope,
    specs: scopeSpecsByScopeId.get(scope.id) ?? [],
    zones: zonesByScopeId.get(scope.id) ?? [],
  }));
};
