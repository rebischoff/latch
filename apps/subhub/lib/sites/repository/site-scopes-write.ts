import { ConflictError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import type {
  SiteScopesPatch,
  SiteZonePatchRow,
} from "../descriptors/site-detail";

const MAX_ZONE_DEPTH = 20;

type FlatZoneRow = {
  id: string;
  name: string;
  parent_zone_id: string | null;
  sort_order: number;
};

type ExistingZoneRow = {
  id: string;
  parent_zone_id: string | null;
  root_item_id: string | null;
};

type ReferenceHit = {
  blocker: "asset" | "estimate" | "job";
  site_zone_id: string;
};

export const flattenZoneTree = (
  zones: SiteZonePatchRow[],
  parentZoneId: string | null,
  depth: number,
  seenIds: Set<string>,
): FlatZoneRow[] => {
  if (depth > MAX_ZONE_DEPTH) {
    throw new ValidationError("Zone tree exceeds maximum depth", {
      field: "scopes",
      code: "max_depth",
    });
  }

  const flat: FlatZoneRow[] = [];

  zones.forEach((zone, index) => {
    const id = zone.id ?? crypto.randomUUID();
    const name = zone.name.trim();

    if (!name) {
      throw new ValidationError("Zone name is required", {
        field: "scopes",
        code: "blank_zone_name",
        id,
      });
    }

    if (seenIds.has(id)) {
      throw new ValidationError("Duplicate zone id in scopes patch", {
        field: "scopes",
        code: "duplicate_zone_id",
        id,
      });
    }
    seenIds.add(id);

    flat.push({
      id,
      parent_zone_id: parentZoneId,
      name,
      sort_order: index + 1,
    });

    flat.push(...flattenZoneTree(zone.zones, id, depth + 1, seenIds));
  });

  return flat;
};

const assertRootCategoryExists = async (
  client: PoolClient,
  rootItemId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM item WHERE id = $1 AND parent_id IS NULL`,
    [rootItemId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Unknown root_item_id in scopes", {
      field: "scopes",
      code: "unknown_root_category",
      root_item_id: rootItemId,
    });
  }
};

const assertCollectionPatchIdsValid = async (
  client: PoolClient,
  siteId: string,
  ids: string[],
): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  const result = await client.query<{ id: string; site_id: string }>(
    `SELECT id, site_id FROM site_zone WHERE id = ANY($1::text[])`,
    [ids],
  );

  const owners = new Map(result.rows.map((row) => [row.id, row.site_id]));

  for (const id of ids) {
    const ownerSiteId = owners.get(id);
    if (ownerSiteId !== undefined && ownerSiteId !== siteId) {
      throw new ValidationError("Unknown id in scopes collection patch", {
        field: "scopes",
        code: "unknown_id",
      });
    }
  }
};

export const loadReferencedZonesForSite = async (
  client: PoolClient,
  siteId: string,
): Promise<Map<string, ReferenceHit["blocker"]>> => {
  const result = await client.query<ReferenceHit>(
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
       SELECT jl.site_zone_id, 'job'::text AS blocker
       FROM job_line jl
       INNER JOIN job j ON j.id = jl.job_id
       WHERE j.site_id = $1 AND jl.site_zone_id IS NOT NULL
       UNION
       SELECT sa.site_zone_id, 'asset'::text AS blocker
       FROM site_asset sa
       WHERE sa.site_id = $1 AND sa.site_zone_id IS NOT NULL
     ) refs`,
    [siteId],
  );

  const blockers = new Map<string, ReferenceHit["blocker"]>();
  for (const row of result.rows) {
    if (!blockers.has(row.site_zone_id)) {
      blockers.set(row.site_zone_id, row.blocker);
    }
  }
  return blockers;
};

export const assertNoReferencedZoneDeletes = (
  omittedZoneIds: string[],
  references: Map<string, ReferenceHit["blocker"]>,
  field: "scopes" = "scopes",
): void => {
  for (const zoneId of omittedZoneIds) {
    const blocker = references.get(zoneId);
    if (blocker) {
      throw new ConflictError("Cannot delete referenced site zone", {
        field,
        code: "referenced",
        blocker,
        id: zoneId,
      });
    }
  }
};

/** D2: refuse to omit a root while any direct child still exists in DB. */
export const assertNoRootWithChildrenDeletes = (
  omittedRootIds: string[],
  existingZones: ExistingZoneRow[],
  field: "scopes" = "scopes",
): void => {
  for (const rootId of omittedRootIds) {
    const hasChild = existingZones.some((row) => row.parent_zone_id === rootId);
    if (hasChild) {
      throw new ConflictError("Cannot delete root zone while it has children", {
        field,
        code: "has_children",
        id: rootId,
      });
    }
  }
};

const collectSubtreeZoneIds = async (
  client: PoolClient,
  siteId: string,
  rootZoneIds: string[],
): Promise<Set<string>> => {
  if (rootZoneIds.length === 0) {
    return new Set();
  }

  const result = await client.query<{ id: string }>(
    `WITH RECURSIVE subtree AS (
       SELECT id FROM site_zone
       WHERE site_id = $1 AND id = ANY($2::text[])
       UNION ALL
       SELECT sz.id
       FROM site_zone sz
       INNER JOIN subtree st ON sz.parent_zone_id = st.id
       WHERE sz.site_id = $1
     )
     SELECT id FROM subtree`,
    [siteId, rootZoneIds],
  );

  return new Set(result.rows.map((row) => row.id));
};

const isRootRow = (row: ExistingZoneRow): boolean =>
  row.parent_zone_id === null && row.root_item_id !== null;

export const replaceSiteScopesTx = async (
  client: PoolClient,
  siteId: string,
  patch: SiteScopesPatch,
): Promise<void> => {
  if (patch.scopes === undefined) {
    return;
  }

  const scopes = patch.scopes;

  const normalizedScopes = scopes.map((row, index) => ({
    ...row,
    id: row.id ?? crypto.randomUUID(),
    sort_order: index + 1,
  }));

  for (const row of normalizedScopes) {
    await assertRootCategoryExists(client, row.root_item_id);
  }

  const rootKeepIds = normalizedScopes
    .map((row) => row.id)
    .filter((id): id is string => id !== undefined);

  const seenZoneIds = new Set<string>(rootKeepIds);
  const flatZones = normalizedScopes.flatMap((scope) =>
    flattenZoneTree(scope.zones, scope.id, 0, seenZoneIds),
  );

  const zoneKeepIds = flatZones.map((row) => row.id);
  await assertCollectionPatchIdsValid(client, siteId, [...rootKeepIds, ...zoneKeepIds]);

  const existingResult = await client.query<ExistingZoneRow>(
    `SELECT id, parent_zone_id, root_item_id
     FROM site_zone
     WHERE site_id = $1`,
    [siteId],
  );
  const existingZones = existingResult.rows;
  const existingRoots = existingZones.filter(isRootRow);
  const existingChildren = existingZones.filter((row) => !isRootRow(row));

  const payloadRootIds = new Set(rootKeepIds);
  const rootsToDelete = existingRoots
    .map((row) => row.id)
    .filter((id) => !payloadRootIds.has(id));

  const payloadZoneIds = new Set(zoneKeepIds);
  const zonesToDelete = existingChildren
    .map((row) => row.id)
    .filter((id) => !payloadZoneIds.has(id));

  assertNoRootWithChildrenDeletes(rootsToDelete, existingZones);

  const references = await loadReferencedZonesForSite(client, siteId);

  const zonesToDeleteSubtree = await collectSubtreeZoneIds(client, siteId, zonesToDelete);
  assertNoReferencedZoneDeletes([...zonesToDeleteSubtree], references);

  assertNoReferencedZoneDeletes(rootsToDelete, references);

  if (zonesToDelete.length > 0) {
    await client.query(
      `DELETE FROM site_zone
       WHERE site_id = $1
         AND id = ANY($2::text[])`,
      [siteId, zonesToDelete],
    );
  }

  if (rootsToDelete.length > 0) {
    await client.query(
      `DELETE FROM site_zone
       WHERE site_id = $1
         AND id = ANY($2::text[])
         AND parent_zone_id IS NULL
         AND root_item_id IS NOT NULL`,
      [siteId, rootsToDelete],
    );
  }

  const existingIds = new Set(existingZones.map((row) => row.id));

  for (const scope of normalizedScopes) {
    if (existingIds.has(scope.id)) {
      await client.query(
        `UPDATE site_zone
         SET root_item_id = $2,
             parent_zone_id = NULL,
             name = $3,
             sort_order = $4,
             status = 'active'
         WHERE id = $1
           AND site_id = $5`,
        [scope.id, scope.root_item_id, scope.name, scope.sort_order, siteId],
      );
    } else {
      await client.query(
        `INSERT INTO site_zone (
           id,
           site_id,
           parent_zone_id,
           root_item_id,
           name,
           sort_order,
           status
         )
         VALUES ($1, $2, NULL, $3, $4, $5, 'active')`,
        [scope.id, siteId, scope.root_item_id, scope.name, scope.sort_order],
      );
    }
  }

  for (const zone of flatZones) {
    if (existingIds.has(zone.id)) {
      await client.query(
        `UPDATE site_zone
         SET parent_zone_id = $2,
             root_item_id = NULL,
             name = $3,
             sort_order = $4,
             status = 'active'
         WHERE id = $1
           AND site_id = $5`,
        [zone.id, zone.parent_zone_id, zone.name, zone.sort_order, siteId],
      );
    } else {
      await client.query(
        `INSERT INTO site_zone (
           id,
           site_id,
           parent_zone_id,
           root_item_id,
           name,
           sort_order,
           status
         )
         VALUES ($1, $2, $3, NULL, $4, $5, 'active')`,
        [zone.id, siteId, zone.parent_zone_id, zone.name, zone.sort_order],
      );
    }
  }
};

export const replaceSiteScopes = async (
  pool: Pool,
  actorId: string,
  siteId: string,
  patch: SiteScopesPatch,
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceSiteScopesTx(client, siteId, patch);
  });
};
