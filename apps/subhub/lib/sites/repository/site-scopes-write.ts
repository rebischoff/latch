import { ConflictError, ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import type {
  SiteScopePatchRow,
  SiteScopesPatch,
  SiteZonePatchRow,
} from "../descriptors/site-detail";

const MAX_ZONE_DEPTH = 20;

type FlatZoneRow = {
  id: string;
  name: string;
  parent_zone_id: string | null;
  site_scope_id: string | null;
  sort_order: number;
};

type ReferenceHit = {
  blocker: "asset" | "estimate" | "job";
  site_zone_id: string;
};

export const flattenZoneTree = (
  zones: SiteZonePatchRow[],
  siteScopeId: string | null,
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
      site_scope_id: siteScopeId,
      parent_zone_id: parentZoneId,
      name: zone.name,
      sort_order: index + 1,
    });

    flat.push(
      ...flattenZoneTree(zone.zones, siteScopeId, id, depth + 1, seenIds),
    );
  });

  return flat;
};

const assertRootCategoryExists = async (
  client: PoolClient,
  rootCategoryId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM category WHERE id = $1 AND parent_id IS NULL`,
    [rootCategoryId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Unknown root_category_id in scopes", {
      field: "scopes",
      code: "unknown_root_category",
      root_category_id: rootCategoryId,
    });
  }
};

const assertCollectionPatchIdsValid = async (
  client: PoolClient,
  table: "site_zone" | "site_scope",
  siteId: string,
  ids: string[],
  field: "scopes",
): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  const result = await client.query<{ id: string; site_id: string }>(
    `SELECT id, site_id FROM ${table} WHERE id = ANY($1::text[])`,
    [ids],
  );

  const owners = new Map(result.rows.map((row) => [row.id, row.site_id]));

  for (const id of ids) {
    const ownerSiteId = owners.get(id);
    if (ownerSiteId !== undefined && ownerSiteId !== siteId) {
      throw new ValidationError(
        field === "scopes"
          ? "Unknown id in scopes collection patch"
          : "Unknown id in zones collection patch",
        { field, code: "unknown_id" },
      );
    }
  }
};

export const loadReferencedZonesForSite = async (
  client: PoolClient,
  siteId: string,
): Promise<Map<string, ReferenceHit["blocker"]>> => {
  const result = await client.query<ReferenceHit>(
    `SELECT site_zone_id, blocker FROM (
       SELECT el.site_zone_id, 'estimate'::text AS blocker
       FROM estimate_line el
       INNER JOIN estimate e ON e.id = el.estimate_id
       WHERE e.site_id = $1 AND el.site_zone_id IS NOT NULL
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
  field: "scopes",
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
    await assertRootCategoryExists(client, row.root_category_id);
  }

  const scopeKeepIds = normalizedScopes
    .map((row) => row.id)
    .filter((id): id is string => id !== undefined);

  await assertCollectionPatchIdsValid(client, "site_scope", siteId, scopeKeepIds, "scopes");

  const seenZoneIds = new Set<string>();
  const flatZones = normalizedScopes.flatMap((scope) =>
    flattenZoneTree(scope.zones, scope.id, null, 0, seenZoneIds),
  );

  const zoneKeepIds = flatZones.map((row) => row.id);
  await assertCollectionPatchIdsValid(client, "site_zone", siteId, zoneKeepIds, "scopes");

  const existingScopes = await client.query<{ id: string }>(
    `SELECT id FROM site_scope WHERE site_id = $1`,
    [siteId],
  );
  const existingZones = await client.query<{ id: string; site_scope_id: string | null }>(
    `SELECT id, site_scope_id FROM site_zone WHERE site_id = $1`,
    [siteId],
  );

  const payloadScopeIds = new Set(scopeKeepIds);
  const scopesToDelete = existingScopes.rows
    .map((row) => row.id)
    .filter((id) => !payloadScopeIds.has(id));

  const payloadZoneIds = new Set(zoneKeepIds);
  const zonesToDelete = existingZones.rows
    .map((row) => row.id)
    .filter((id) => !payloadZoneIds.has(id));

  const references = await loadReferencedZonesForSite(client, siteId);

  const zonesToDeleteSubtree = await collectSubtreeZoneIds(client, siteId, zonesToDelete);
  assertNoReferencedZoneDeletes([...zonesToDeleteSubtree], references, "scopes");

  for (const scopeId of scopesToDelete) {
    const scopeZoneIds = existingZones.rows
      .filter((row) => row.site_scope_id === scopeId)
      .map((row) => row.id);
    const subtreeIds = await collectSubtreeZoneIds(client, siteId, scopeZoneIds);
    assertNoReferencedZoneDeletes([...subtreeIds], references, "scopes");
  }

  if (zonesToDelete.length > 0) {
    await client.query(
      `DELETE FROM site_zone
       WHERE site_id = $1
         AND id = ANY($2::text[])`,
      [siteId, zonesToDelete],
    );
  }

  if (scopesToDelete.length > 0) {
    await client.query(
      `DELETE FROM site_scope
       WHERE site_id = $1
         AND id = ANY($2::text[])`,
      [siteId, scopesToDelete],
    );
  }

  const existingScopeIds = new Set(existingScopes.rows.map((row) => row.id));
  const existingZoneIds = new Set(existingZones.rows.map((row) => row.id));

  for (const scope of normalizedScopes) {
    if (existingScopeIds.has(scope.id)) {
      await client.query(
        `UPDATE site_scope
         SET root_category_id = $2,
             name = $3,
             sort_order = $4,
             status = 'active'
         WHERE id = $1
           AND site_id = $5`,
        [scope.id, scope.root_category_id, scope.name, scope.sort_order, siteId],
      );
    } else {
      await client.query(
        `INSERT INTO site_scope (id, site_id, root_category_id, name, sort_order, status)
         VALUES ($1, $2, $3, $4, $5, 'active')`,
        [scope.id, siteId, scope.root_category_id, scope.name, scope.sort_order],
      );
    }
  }

  for (const zone of flatZones) {
    if (existingZoneIds.has(zone.id)) {
      await client.query(
        `UPDATE site_zone
         SET site_scope_id = $2,
             parent_zone_id = $3,
             name = $4,
             sort_order = $5,
             status = 'active'
         WHERE id = $1
           AND site_id = $6`,
        [
          zone.id,
          zone.site_scope_id,
          zone.parent_zone_id,
          zone.name,
          zone.sort_order,
          siteId,
        ],
      );
    } else {
      await client.query(
        `INSERT INTO site_zone (
           id,
           site_id,
           site_scope_id,
           parent_zone_id,
           name,
           sort_order,
           status
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [
          zone.id,
          siteId,
          zone.site_scope_id,
          zone.parent_zone_id,
          zone.name,
          zone.sort_order,
        ],
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
