import type { Pool } from "pg";

import type {
  SiteScopePatchRow,
  SiteScopeRow,
  SiteZonePatchRow,
  SiteZoneRow,
} from "../descriptors/site-detail";

type SiteZoneFlatRow = {
  id: string;
  name: string;
  parent_zone_id: string | null;
  root_item_id: string | null;
  root_item_name: string | null;
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
       SELECT ela.site_zone_id, 'estimate'::text AS blocker
       FROM estimate_line_allocation ela
       INNER JOIN estimate_line el ON el.id = ela.estimate_line_id
       INNER JOIN estimate e ON e.id = el.estimate_id
       WHERE e.site_id = $1
       UNION
       SELECT ec.site_zone_id, 'estimate'::text AS blocker
       FROM estimate_condition ec
       INNER JOIN estimate e ON e.id = ec.estimate_id
       WHERE e.site_id = $1 AND ec.site_zone_id IS NOT NULL
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
  const [zonesResult, references] = await Promise.all([
    pool.query<SiteZoneFlatRow>(
      `SELECT
         sz.id,
         sz.parent_zone_id,
         sz.root_item_id,
         c.name AS root_item_name,
         sz.name,
         sz.sort_order,
         sz.status
       FROM site_zone sz
       LEFT JOIN item c ON c.id = sz.root_item_id
       WHERE sz.site_id = $1
       ORDER BY sz.sort_order ASC, sz.id ASC`,
      [siteId],
    ),
    loadReferencedZoneIds(pool, siteId),
  ]);

  const roots = zonesResult.rows.filter(
    (row) => row.parent_zone_id === null && row.root_item_id !== null,
  );
  const children = zonesResult.rows.filter((row) => row.parent_zone_id !== null);

  const hasDirectChild = (rootId: string): boolean =>
    children.some((row) => row.parent_zone_id === rootId);

  const scopes: SiteScopeRow[] = roots.map((root) => ({
    id: root.id,
    root_item_id: root.root_item_id as string,
    root_item_name: root.root_item_name ?? "",
    name: root.name,
    sort_order: root.sort_order,
    status: root.status,
    can_delete: !hasDirectChild(root.id) && !references.ids.has(root.id),
    zones: nestZones(children, root.id, references.ids),
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
  root_item_id: row.root_item_id,
  name: row.name,
  sort_order: row.sort_order,
  zones: row.zones.map(toZonePatchRow),
});
