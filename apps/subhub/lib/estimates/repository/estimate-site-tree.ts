import type { Pool } from "pg";

import { scopePanelDefs } from "@/lib/catalog/repository/item-effective-specs";

import type {
  EstimateSiteScopeTreeRow,
  EstimateSiteTreeRow,
  EstimateSiteZoneTreeRow,
  EstimateScopeSpecRow,
} from "../descriptors/estimate-detail";

type SiteScopeBaseRow = {
  id: string;
  name: string;
  root_item_id: string;
};

type SiteZoneFlatRow = {
  id: string;
  name: string;
  parent_zone_id: string | null;
  site_scope_id: string | null;
  sort_order: number;
};

const nestZones = (
  flatRows: SiteZoneFlatRow[],
  parentId: string | null,
): EstimateSiteZoneTreeRow[] => {
  const children = flatRows
    .filter((row) => (row.parent_zone_id ?? null) === parentId)
    .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id));

  return children.map((row) => {
    const nested = nestZones(flatRows, row.id);
    return {
      id: row.id,
      name: row.name,
      ...(nested.length > 0 ? { zones: nested } : {}),
    };
  });
};

export const loadEstimateSiteTree = async (
  pool: Pool,
  siteId: string,
): Promise<EstimateSiteTreeRow> => {
  const [scopesResult, zonesResult] = await Promise.all([
    pool.query<SiteScopeBaseRow>(
      `SELECT ss.id, ss.name, ss.root_item_id
       FROM site_scope ss
       WHERE ss.site_id = $1
       ORDER BY ss.sort_order ASC, ss.id ASC`,
      [siteId],
    ),
    pool.query<SiteZoneFlatRow>(
      `SELECT id, site_scope_id, parent_zone_id, name, sort_order
       FROM site_zone
       WHERE site_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [siteId],
    ),
  ]);

  const zonesByScopeId = new Map<string | null, SiteZoneFlatRow[]>();
  for (const zone of zonesResult.rows) {
    const key = zone.site_scope_id ?? null;
    const bucket = zonesByScopeId.get(key) ?? [];
    bucket.push(zone);
    zonesByScopeId.set(key, bucket);
  }

  const scopes: EstimateSiteScopeTreeRow[] = scopesResult.rows.map((scope) => ({
    id: scope.id,
    name: scope.name,
    root_item_id: scope.root_item_id,
    zones: nestZones(zonesByScopeId.get(scope.id) ?? [], null),
  }));

  return {
    scopes,
    spec_templates: await loadSpecTemplatesForRoots(
      pool,
      scopesResult.rows.map((scope) => scope.root_item_id),
    ),
  };
};

/** Blank scope-panel rows for catalog root(s) — used by site_tree and Add scope. */
export const loadSpecTemplatesForRoots = async (
  pool: Pool,
  rootItemIds: string[],
): Promise<Record<string, EstimateScopeSpecRow[]>> => {
  const uniqueRoots = [...new Set(rootItemIds)];
  if (uniqueRoots.length === 0) {
    return {};
  }

  const panelDefsByRoot = await Promise.all(
    uniqueRoots.map(async (rootItemId) => ({
      rootItemId,
      defs: await scopePanelDefs(pool, rootItemId),
    })),
  );

  const allPanelDefs = panelDefsByRoot.flatMap((entry) => entry.defs);
  const defIds = [...new Set(allPanelDefs.map((def) => def.spec_def_id))];
  const optionsByDefId = new Map<string, EstimateScopeSpecRow["options"]>();

  if (defIds.length > 0) {
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
  }

  const templates: Record<string, EstimateScopeSpecRow[]> = {};
  for (const entry of panelDefsByRoot) {
    templates[entry.rootItemId] = entry.defs.map((def) => ({
      spec_def_id: def.spec_def_id,
      def_display_name: def.display_name,
      value_type: def.value_type,
      spec_option_id: null,
      option_display_name: null,
      value_number: null,
      value_number_max: null,
      value_boolean: null,
      unit_symbol: def.unit_symbol,
      to_canonical_factor: def.to_canonical_factor,
      decimal_places: def.decimal_places,
      options: optionsByDefId.get(def.spec_def_id) ?? [],
    }));
  }

  return templates;
};
