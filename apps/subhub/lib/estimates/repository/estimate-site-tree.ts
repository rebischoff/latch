import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { scopePanelDefs } from "@/lib/catalog/repository/item-effective-specs";

import type {
  EstimateSiteScopeTreeRow,
  EstimateSiteTreeRow,
  EstimateSiteZoneTreeRow,
  EstimateScopeSpecRow,
} from "../descriptors/estimate-detail";

type SiteZoneFlatRow = {
  id: string;
  name: string;
  parent_zone_id: string | null;
  root_item_id: string | null;
  sort_order: number;
};

export type EstimateRootSiteZoneRow = {
  id: string;
  name: string;
  root_item_id: string;
  root_item_name: string | null;
  sort_order: number;
  status: string;
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
  const zonesResult = await pool.query<SiteZoneFlatRow>(
    `SELECT id, parent_zone_id, root_item_id, name, sort_order
     FROM site_zone
     WHERE site_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [siteId],
  );

  const roots = zonesResult.rows.filter(
    (row) => row.parent_zone_id === null && row.root_item_id !== null,
  );
  const children = zonesResult.rows.filter((row) => row.parent_zone_id !== null);

  const scopes: EstimateSiteScopeTreeRow[] = roots.map((root) => ({
    id: root.id,
    name: root.name,
    root_item_id: root.root_item_id as string,
    zones: nestZones(children, root.id),
  }));

  return {
    scopes,
    spec_templates: await loadSpecTemplatesForRoots(
      pool,
      roots.map((root) => root.root_item_id as string),
    ),
  };
};

/** Root-level site_zone rows for estimate Add-root picker (42b). */
export const listRootSiteZonesForSite = async (
  pool: Pool,
  siteId: string,
): Promise<EstimateRootSiteZoneRow[]> => {
  const result = await pool.query<EstimateRootSiteZoneRow>(
    `SELECT
       sz.id,
       sz.name,
       sz.root_item_id,
       i.name AS root_item_name,
       sz.sort_order,
       sz.status
     FROM site_zone sz
     LEFT JOIN item i ON i.id = sz.root_item_id
     WHERE sz.site_id = $1
       AND sz.parent_zone_id IS NULL
       AND sz.root_item_id IS NOT NULL
     ORDER BY sz.sort_order ASC, sz.name ASC, sz.id ASC`,
    [siteId],
  );
  return result.rows;
};

const assertCatalogRootItem = async (
  client: PoolClient,
  rootItemId: string,
): Promise<string> => {
  const result = await client.query<{ id: string; name: string; parent_id: string | null }>(
    `SELECT id, name, parent_id FROM item WHERE id = $1`,
    [rootItemId],
  );
  const row = result.rows[0];
  if (!row) {
    throw new ValidationError("Unknown root_item_id", {
      field: "root_item_id",
      code: "unknown_root_item",
      root_item_id: rootItemId,
    });
  }
  if (row.parent_id !== null) {
    throw new ValidationError("root_item_id must be a catalog root", {
      field: "root_item_id",
      code: "root_not_root",
      root_item_id: rootItemId,
    });
  }
  return row.name;
};

/** Create a proposed root site_zone for estimate Add-root "New…" (42b D4). */
export const createProposedRootSiteZone = async (
  pool: Pool,
  actorId: string,
  input: { name?: string; rootItemId: string; siteId: string },
): Promise<EstimateRootSiteZoneRow> => {
  return withPermissionDb(pool, actorId, async (client) => {
    const site = await client.query<{ id: string }>(
      `SELECT id FROM site WHERE id = $1`,
      [input.siteId],
    );
    if (site.rows.length === 0) {
      throw new ValidationError("Unknown site_id", {
        field: "site_id",
        code: "unknown_site",
        site_id: input.siteId,
      });
    }

    const rootItemName = await assertCatalogRootItem(client, input.rootItemId);
    const name = (input.name?.trim() || rootItemName).trim();
    if (!name) {
      throw new ValidationError("name is required", {
        field: "name",
        code: "required",
      });
    }

    const sortResult = await client.query<{ max: number | null }>(
      `SELECT MAX(sort_order) AS max
       FROM site_zone
       WHERE site_id = $1 AND parent_zone_id IS NULL`,
      [input.siteId],
    );
    const sortOrder = (sortResult.rows[0]?.max ?? 0) + 1;
    const id = crypto.randomUUID();

    await client.query(
      `INSERT INTO site_zone (
         id, site_id, parent_zone_id, root_item_id, name, sort_order, status
       ) VALUES ($1, $2, NULL, $3, $4, $5, 'proposed')`,
      [id, input.siteId, input.rootItemId, name, sortOrder],
    );

    return {
      id,
      name,
      root_item_id: input.rootItemId,
      root_item_name: rootItemName,
      sort_order: sortOrder,
      status: "proposed",
    };
  });
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
