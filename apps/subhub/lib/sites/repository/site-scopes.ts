import type { Pool } from "pg";

import type {
  SiteScopePatchRow,
  SiteScopeRow,
  SiteZonePatchRow,
  SiteZoneRow,
} from "../descriptors/site-detail";

type SiteScopeBaseRow = {
  id: string;
  name: string;
  sort_order: number;
  status: string;
  root_category_id: string;
  root_category_name: string;
};

type SiteZoneFlatRow = {
  id: string;
  name: string;
  parent_zone_id: string | null;
  site_scope_id: string | null;
  sort_order: number;
  status: string;
};

type ReferenceRow = {
  blocker: "asset" | "estimate" | "job";
  site_zone_id: string;
};

const nestZones = (
  flatRows: SiteZoneFlatRow[],
  parentId: string | null,
  referencedIds: Set<string>,
): SiteZoneRow[] => {
  const children = flatRows
    .filter((row) => (row.parent_zone_id ?? null) === parentId)
    .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id));

  return children.map((row) => ({
    id: row.id,
    name: row.name,
    sort_order: row.sort_order,
    status: row.status,
    can_delete: !referencedIds.has(row.id),
    zones: nestZones(flatRows, row.id, referencedIds),
  }));
};

const loadReferencedZoneIds = async (
  pool: Pool,
  siteId: string,
): Promise<{ ids: Set<string>; blockers: Map<string, ReferenceRow["blocker"]> }> => {
  const result = await pool.query<ReferenceRow>(
    `SELECT site_zone_id, blocker FROM (
       SELECT site_zone_id, 'estimate'::text AS blocker
       FROM estimate_line el
       INNER JOIN estimate e ON e.id = el.estimate_id
       WHERE e.site_id = $1 AND el.site_zone_id IS NOT NULL
       UNION
       SELECT site_zone_id, 'job'::text AS blocker
       FROM job_line jl
       INNER JOIN job j ON j.id = jl.job_id
       WHERE j.site_id = $1 AND jl.site_zone_id IS NOT NULL
       UNION
       SELECT site_zone_id, 'asset'::text AS blocker
       FROM site_asset sa
       WHERE sa.site_id = $1 AND sa.site_zone_id IS NOT NULL
     ) refs`,
    [siteId],
  );

  const ids = new Set<string>();
  const blockers = new Map<string, ReferenceRow["blocker"]>();

  for (const row of result.rows) {
    ids.add(row.site_zone_id);
    if (!blockers.has(row.site_zone_id)) {
      blockers.set(row.site_zone_id, row.blocker);
    }
  }

  return { ids, blockers };
};

export const loadSiteScopes = async (
  pool: Pool,
  siteId: string,
): Promise<{ scopes: SiteScopeRow[] }> => {
  const [scopesResult, zonesResult, references] = await Promise.all([
    pool.query<SiteScopeBaseRow>(
      `SELECT
         ss.id,
         ss.root_category_id,
         c.name AS root_category_name,
         ss.name,
         ss.sort_order,
         ss.status
       FROM site_scope ss
       INNER JOIN category c ON c.id = ss.root_category_id
       WHERE ss.site_id = $1
       ORDER BY ss.sort_order ASC, ss.id ASC`,
      [siteId],
    ),
    pool.query<SiteZoneFlatRow>(
      `SELECT
         id,
         site_scope_id,
         parent_zone_id,
         name,
         sort_order,
         status
       FROM site_zone
       WHERE site_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [siteId],
    ),
    loadReferencedZoneIds(pool, siteId),
  ]);

  const zonesByScopeId = new Map<string | null, SiteZoneFlatRow[]>();
  for (const zone of zonesResult.rows) {
    const key = zone.site_scope_id ?? null;
    const bucket = zonesByScopeId.get(key) ?? [];
    bucket.push(zone);
    zonesByScopeId.set(key, bucket);
  }

  const scopeSubtreeReferenced = (scopeId: string): boolean => {
    const scopeZones = zonesByScopeId.get(scopeId) ?? [];
    return scopeZones.some((zone) => references.ids.has(zone.id));
  };

  const scopes: SiteScopeRow[] = scopesResult.rows.map((scope) => ({
    id: scope.id,
    root_category_id: scope.root_category_id,
    root_category_name: scope.root_category_name,
    name: scope.name,
    sort_order: scope.sort_order,
    status: scope.status,
    can_delete: !scopeSubtreeReferenced(scope.id),
    zones: nestZones(zonesByScopeId.get(scope.id) ?? [], null, references.ids),
  }));

  return { scopes };
};

export const toZonePatchRow = (row: SiteZoneRow): SiteZonePatchRow => ({
  id: row.id,
  name: row.name,
  sort_order: row.sort_order,
  zones: row.zones.map(toZonePatchRow),
});

export const toScopePatchRow = (row: SiteScopeRow): SiteScopePatchRow => ({
  id: row.id,
  root_category_id: row.root_category_id,
  name: row.name,
  sort_order: row.sort_order,
  zones: row.zones.map(toZonePatchRow),
});
