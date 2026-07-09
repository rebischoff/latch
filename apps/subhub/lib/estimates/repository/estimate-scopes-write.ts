import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { loadScopePanelDefIdSet } from "@/lib/catalog/repository/item-effective-specs";
import { tableExists } from "@/lib/sites/repository/sql-utils";

import type {
  EstimateLineItemPatchRow,
  EstimateScopePatchRow,
  EstimateScopeSpecPatchRow,
  EstimateScopeZonePatchRow,
} from "../descriptors/estimate-detail";

const assertNoDuplicateSiteScopeIds = (rows: EstimateScopePatchRow[]): void => {
  const seen = new Set<string | null>();

  for (const row of rows) {
    const siteScopeId = row.site_scope_id;
    if (seen.has(siteScopeId)) {
      throw new ValidationError("Duplicate site_scope_id in scopes", {
        field: "scopes",
        code: "duplicate",
        site_scope_id: siteScopeId,
      });
    }
    seen.add(siteScopeId);
  }
};

const assertNoDuplicateSpecDefs = (
  specs: EstimateScopeSpecPatchRow[],
  context: string,
): void => {
  const seen = new Set<string>();

  for (const spec of specs) {
    if (seen.has(spec.spec_def_id)) {
      throw new ValidationError("Duplicate spec_def_id in specs", {
        field: "scopes",
        code: "duplicate_spec",
        context,
        spec_def_id: spec.spec_def_id,
      });
    }
    seen.add(spec.spec_def_id);
  }
};

const assertNoDuplicateZoneIds = (
  zones: EstimateScopeZonePatchRow[],
  context: string,
): void => {
  const seen = new Set<string>();

  for (const zone of zones) {
    if (seen.has(zone.site_zone_id)) {
      throw new ValidationError("Duplicate site_zone_id in zones", {
        field: "scopes",
        code: "duplicate_zone",
        context,
        site_zone_id: zone.site_zone_id,
      });
    }
    seen.add(zone.site_zone_id);
  }
};

const assertScopeOwnedByEstimate = async (
  client: PoolClient,
  estimateId: string,
  blockId: string,
): Promise<void> => {
  const result = await client.query<{ estimate_id: string }>(
    `SELECT estimate_id FROM estimate_scope WHERE id = $1`,
    [blockId],
  );

  if (result.rows.length === 0) {
    return;
  }

  if (result.rows[0]?.estimate_id !== estimateId) {
    throw new ValidationError("estimate_scope id belongs to another estimate", {
      field: "scopes",
      code: "foreign_block",
      id: blockId,
    });
  }
};

const assertSiteScopeBelongsToSite = async (
  client: PoolClient,
  siteId: string,
  siteScopeId: string,
): Promise<{ root_item_id: string }> => {
  const result = await client.query<{ root_item_id: string }>(
    `SELECT root_item_id FROM site_scope WHERE id = $1 AND site_id = $2`,
    [siteScopeId, siteId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Unknown site_scope_id for estimate site", {
      field: "scopes",
      code: "unknown_site_scope",
      site_scope_id: siteScopeId,
    });
  }

  return result.rows[0]!;
};

const assertZoneBelongsToScopeBucket = async (
  client: PoolClient,
  siteId: string,
  siteZoneId: string,
  siteScopeId: string | null,
): Promise<void> => {
  const result = await client.query<{ site_scope_id: string | null }>(
    `SELECT site_scope_id FROM site_zone WHERE id = $1 AND site_id = $2`,
    [siteZoneId, siteId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Unknown site_zone_id for estimate site", {
      field: "scopes",
      code: "unknown_site_zone",
      site_zone_id: siteZoneId,
    });
  }

  const zoneScopeId = result.rows[0]?.site_scope_id ?? null;
  if (zoneScopeId !== siteScopeId) {
    throw new ValidationError("site_zone_id does not belong to scope bucket", {
      field: "scopes",
      code: "zone_scope_mismatch",
      site_zone_id: siteZoneId,
      site_scope_id: siteScopeId,
    });
  }
};

const assertSpecDefInScopePanel = async (
  client: PoolClient,
  rootItemId: string,
  specDefId: string,
): Promise<void> => {
  const panelIds = await loadScopePanelDefIdSet(client as unknown as Pool, rootItemId);
  if (!panelIds.has(specDefId)) {
    throw new ValidationError("spec_def_id is not in scope panel defs for root category", {
      field: "scopes",
      code: "invalid_scope_panel_spec",
      root_item_id: rootItemId,
      spec_def_id: specDefId,
    });
  }
};

const assertSpecOptionBelongsToDef = async (
  client: PoolClient,
  specDefId: string,
  optionId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM spec_option WHERE id = $1 AND spec_def_id = $2`,
    [optionId, specDefId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("spec_option_id does not belong to spec def", {
      field: "scopes",
      code: "invalid_spec_option",
      spec_def_id: specDefId,
      spec_option_id: optionId,
    });
  }
};

const assertLaborPhasesExist = async (
  client: PoolClient,
  laborPhaseIds: string[],
): Promise<void> => {
  if (laborPhaseIds.length === 0) {
    return;
  }

  const result = await client.query<{ id: string }>(
    `SELECT id FROM labor_phase WHERE id = ANY($1::text[])`,
    [laborPhaseIds],
  );
  if (result.rows.length !== laborPhaseIds.length) {
    throw new ValidationError("Unknown labor_phase_id in included_labor_phases", {
      field: "scopes",
      code: "unknown_labor_phase",
    });
  }
};

const assertNoDuplicateLaborPhases = (
  rows: Array<{ labor_phase_id: string }>,
  context: string,
): void => {
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.labor_phase_id)) {
      throw new ValidationError("Duplicate labor_phase_id in included_labor_phases", {
        field: "scopes",
        code: "duplicate_labor_phase",
        context,
      });
    }
    seen.add(row.labor_phase_id);
  }
};

const replaceScopeLaborPhasesTx = async (
  client: PoolClient,
  estimateScopeId: string,
  rows: Array<{ labor_phase_id: string }>,
): Promise<void> => {
  if (!(await tableExists(client, "estimate_scope_labor_phase"))) {
    return;
  }

  await client.query(`DELETE FROM estimate_scope_labor_phase WHERE estimate_scope_id = $1`, [
    estimateScopeId,
  ]);

  for (const [index, row] of rows.entries()) {
    await client.query(
      `INSERT INTO estimate_scope_labor_phase (
         estimate_scope_id, labor_phase_id, sort_order
       ) VALUES ($1, $2, $3)`,
      [estimateScopeId, row.labor_phase_id, index + 1],
    );
  }
};

const replaceZoneLaborPhasesTx = async (
  client: PoolClient,
  estimateScopeId: string,
  siteZoneId: string,
  rows: Array<{ labor_phase_id: string }>,
): Promise<void> => {
  if (!(await tableExists(client, "estimate_zone_labor_phase"))) {
    return;
  }

  await client.query(
    `DELETE FROM estimate_zone_labor_phase
     WHERE estimate_scope_id = $1 AND site_zone_id = $2`,
    [estimateScopeId, siteZoneId],
  );

  for (const [index, row] of rows.entries()) {
    await client.query(
      `INSERT INTO estimate_zone_labor_phase (
         estimate_scope_id, site_zone_id, labor_phase_id, sort_order
       ) VALUES ($1, $2, $3, $4)`,
      [estimateScopeId, siteZoneId, row.labor_phase_id, index + 1],
    );
  }
};

const loadReferencedScopeAndZoneIds = async (
  client: PoolClient,
  estimateId: string,
  lineItems?: EstimateLineItemPatchRow[],
): Promise<{ scopeIds: Set<string>; zoneIds: Set<string> }> => {
  if (lineItems !== undefined) {
    const scopeIds = new Set<string>();
    const zoneIds = new Set<string>();

    for (const line of lineItems) {
      if (line.estimate_scope_id) {
        scopeIds.add(line.estimate_scope_id);
      }
      if (line.site_zone_id) {
        zoneIds.add(line.site_zone_id);
      }
    }

    return { scopeIds, zoneIds };
  }

  const result = await client.query<{
    estimate_scope_id: string | null;
    site_zone_id: string | null;
  }>(
    `SELECT estimate_scope_id, site_zone_id
     FROM estimate_line
     WHERE estimate_id = $1`,
    [estimateId],
  );

  const scopeIds = new Set<string>();
  const zoneIds = new Set<string>();

  for (const row of result.rows) {
    if (row.estimate_scope_id) {
      scopeIds.add(row.estimate_scope_id);
    }
    if (row.site_zone_id) {
      zoneIds.add(row.site_zone_id);
    }
  }

  return { scopeIds, zoneIds };
};

const assertUncheckNotReferenced = async (
  client: PoolClient,
  estimateId: string,
  existingScopeIds: Set<string>,
  payloadScopeIds: Set<string>,
  existingZoneKeys: Set<string>,
  payloadZoneKeys: Set<string>,
  lineItems?: EstimateLineItemPatchRow[],
): Promise<void> => {
  const { scopeIds: referencedScopeIds, zoneIds: referencedZoneIds } =
    await loadReferencedScopeAndZoneIds(client, estimateId, lineItems);

  for (const scopeId of existingScopeIds) {
    if (!payloadScopeIds.has(scopeId) && referencedScopeIds.has(scopeId)) {
      throw new ValidationError("Cannot remove scope referenced by line_items", {
        field: "scopes",
        code: "scope_referenced",
        estimate_scope_id: scopeId,
      });
    }
  }

  for (const zoneKey of existingZoneKeys) {
    if (!payloadZoneKeys.has(zoneKey) && referencedZoneIds.has(zoneKey.split(":")[1] ?? "")) {
      throw new ValidationError("Cannot remove zone referenced by line_items", {
        field: "scopes",
        code: "zone_referenced",
        site_zone_id: zoneKey.split(":")[1],
      });
    }
  }
};

export const loadEstimateScopeBlockIds = async (
  client: PoolClient,
  estimateId: string,
): Promise<Set<string>> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM estimate_scope WHERE estimate_id = $1`,
    [estimateId],
  );

  return new Set(result.rows.map((row) => row.id));
};

export type CheckedZoneMembership = Map<string, Set<string>>;

export const buildCheckedZoneMembership = (
  scopes: EstimateScopePatchRow[],
): CheckedZoneMembership => {
  const membership = new Map<string, Set<string>>();

  for (const scope of scopes) {
    const scopeId = scope.id;
    if (!scopeId) {
      continue;
    }

    membership.set(
      scopeId,
      new Set(scope.zones.map((zone) => zone.site_zone_id)),
    );
  }

  return membership;
};

export const replaceEstimateScopesTx = async (
  client: PoolClient,
  estimateId: string,
  siteId: string,
  rows: EstimateScopePatchRow[],
  lineItems?: EstimateLineItemPatchRow[],
): Promise<Set<string>> => {
  assertNoDuplicateSiteScopeIds(rows);

  const normalized = rows.map((row) => ({
    ...row,
    id: row.id ?? crypto.randomUUID(),
    complexity_factor_id: row.complexity_factor_id ?? null,
    included_labor_phases: row.included_labor_phases ?? [],
    zones: row.zones.map((zone) => ({
      ...zone,
      complexity_factor_id: zone.complexity_factor_id ?? null,
      included_labor_phases: zone.included_labor_phases ?? [],
    })),
  }));

  for (const row of normalized) {
    if (!row.site_scope_id) {
      throw new ValidationError("Scoped row requires site_scope_id", {
        field: "scopes",
        code: "missing_site_scope",
        id: row.id,
      });
    }

    if (!row.root_item_id) {
      throw new ValidationError("Scoped row requires root_item_id", {
        field: "scopes",
        code: "missing_root_category",
        id: row.id,
      });
    }

    const siteScope = await assertSiteScopeBelongsToSite(
      client,
      siteId,
      row.site_scope_id,
    );

    if (row.root_item_id !== siteScope.root_item_id) {
      throw new ValidationError("root_item_id must match site scope root", {
        field: "scopes",
        code: "root_mismatch",
        site_scope_id: row.site_scope_id,
        root_item_id: row.root_item_id,
      });
    }

    assertNoDuplicateSpecDefs(row.specs, row.id);
    assertNoDuplicateLaborPhases(row.included_labor_phases, row.id);
    await assertLaborPhasesExist(
      client,
      row.included_labor_phases.map((phase) => phase.labor_phase_id),
    );
    for (const spec of row.specs) {
      await assertSpecDefInScopePanel(
        client,
        siteScope.root_item_id,
        spec.spec_def_id,
      );
      if (spec.spec_option_id !== null && spec.spec_option_id !== undefined) {
        await assertSpecOptionBelongsToDef(
          client,
          spec.spec_def_id,
          spec.spec_option_id,
        );
      }
    }

    assertNoDuplicateZoneIds(row.zones, row.id);
  }

  for (const row of normalized) {
    if (row.id) {
      await assertScopeOwnedByEstimate(client, estimateId, row.id);
    }

    for (const zone of row.zones) {
      await assertZoneBelongsToScopeBucket(
        client,
        siteId,
        zone.site_zone_id,
        row.site_scope_id,
      );

      assertNoDuplicateSpecDefs(zone.specs, `${row.id}:${zone.site_zone_id}`);
      assertNoDuplicateLaborPhases(
        zone.included_labor_phases,
        `${row.id}:${zone.site_zone_id}`,
      );
      await assertLaborPhasesExist(
        client,
        zone.included_labor_phases.map((phase) => phase.labor_phase_id),
      );
      for (const spec of zone.specs) {
        await assertSpecDefInScopePanel(
          client,
          row.root_item_id,
          spec.spec_def_id,
        );
        if (spec.spec_option_id !== null && spec.spec_option_id !== undefined) {
          await assertSpecOptionBelongsToDef(
            client,
            spec.spec_def_id,
            spec.spec_option_id,
          );
        }
      }
    }
  }

  const existingScopes = await client.query<{ id: string }>(
    `SELECT id FROM estimate_scope WHERE estimate_id = $1`,
    [estimateId],
  );
  const existingScopeIds = new Set(existingScopes.rows.map((row) => row.id));
  const payloadScopeIds = new Set(normalized.map((row) => row.id));

  const existingZones = await client.query<{
    estimate_scope_id: string;
    site_zone_id: string;
  }>(
    `SELECT ez.estimate_scope_id, ez.site_zone_id
     FROM estimate_zone ez
     INNER JOIN estimate_scope es ON es.id = ez.estimate_scope_id
     WHERE es.estimate_id = $1`,
    [estimateId],
  );
  const existingZoneKeys = new Set(
    existingZones.rows.map((row) => `${row.estimate_scope_id}:${row.site_zone_id}`),
  );
  const payloadZoneKeys = new Set(
    normalized.flatMap((scope) =>
      scope.zones.map((zone) => `${scope.id}:${zone.site_zone_id}`),
    ),
  );

  await assertUncheckNotReferenced(
    client,
    estimateId,
    existingScopeIds,
    payloadScopeIds,
    existingZoneKeys,
    payloadZoneKeys,
    lineItems,
  );

  const toDelete = [...existingScopeIds].filter((id) => !payloadScopeIds.has(id));
  if (toDelete.length > 0) {
    await client.query(
      `DELETE FROM estimate_scope
       WHERE estimate_id = $1
         AND id = ANY($2::text[])`,
      [estimateId, toDelete],
    );
  }

  const existingIds = new Set(existingScopes.rows.map((row) => row.id));

  for (const row of normalized) {
    if (existingIds.has(row.id)) {
      await client.query(
        `UPDATE estimate_scope
         SET site_scope_id = $2,
             root_item_id = $3,
             sort_order = $4,
             complexity_factor_id = $5
         WHERE id = $1
           AND estimate_id = $6`,
        [
          row.id,
          row.site_scope_id,
          row.root_item_id,
          row.sort_order,
          row.complexity_factor_id,
          estimateId,
        ],
      );
    } else {
      await client.query(
        `INSERT INTO estimate_scope (
           id,
           estimate_id,
           site_scope_id,
           root_item_id,
           sort_order,
           complexity_factor_id
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          row.id,
          estimateId,
          row.site_scope_id,
          row.root_item_id,
          row.sort_order,
          row.complexity_factor_id,
        ],
      );
    }

    await client.query(`DELETE FROM estimate_scope_spec WHERE estimate_scope_id = $1`, [
      row.id,
    ]);

    for (const spec of row.specs) {
      await client.query(
        `INSERT INTO estimate_scope_spec (
           estimate_scope_id,
           spec_def_id,
           spec_option_id,
           value_boolean,
           value_number
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          row.id,
          spec.spec_def_id,
          spec.spec_option_id ?? null,
          spec.value_boolean ?? null,
          spec.value_number ?? null,
        ],
      );
    }

    await replaceScopeLaborPhasesTx(client, row.id, row.included_labor_phases);

    await client.query(`DELETE FROM estimate_zone WHERE estimate_scope_id = $1`, [row.id]);

    for (const zone of row.zones) {
      await client.query(
        `INSERT INTO estimate_zone (estimate_scope_id, site_zone_id, sort_order, complexity_factor_id)
         VALUES ($1, $2, $3, $4)`,
        [row.id, zone.site_zone_id, zone.sort_order, zone.complexity_factor_id],
      );

      await client.query(
        `DELETE FROM estimate_zone_spec
         WHERE estimate_scope_id = $1 AND site_zone_id = $2`,
        [row.id, zone.site_zone_id],
      );

      for (const spec of zone.specs) {
        await client.query(
          `INSERT INTO estimate_zone_spec (
             estimate_scope_id,
             site_zone_id,
             spec_def_id,
             spec_option_id,
             value_boolean,
             value_number
           )
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            row.id,
            zone.site_zone_id,
            spec.spec_def_id,
            spec.spec_option_id ?? null,
            spec.value_boolean ?? null,
            spec.value_number ?? null,
          ],
        );
      }

      await replaceZoneLaborPhasesTx(
        client,
        row.id,
        zone.site_zone_id,
        zone.included_labor_phases,
      );
    }
  }

  return new Set(normalized.map((row) => row.id));
};

export const replaceEstimateScopes = async (
  pool: Pool,
  actorId: string,
  estimateId: string,
  siteId: string,
  rows: EstimateScopePatchRow[],
  lineItems?: EstimateLineItemPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceEstimateScopesTx(client, estimateId, siteId, rows, lineItems);
  });
};
