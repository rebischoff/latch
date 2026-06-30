import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import type {
  EstimateSystemPatchRow,
  EstimateSystemSpecPatchRow,
} from "../descriptors/estimate-detail";

const assertNoDuplicateSystemIds = (rows: EstimateSystemPatchRow[]): void => {
  const seen = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.system_id)) {
      throw new ValidationError("Duplicate system_id in systems", {
        field: "systems",
        code: "duplicate",
        system_id: row.system_id,
      });
    }
    seen.add(row.system_id);
  }
};

const assertNoDuplicateSpecDefs = (
  specs: EstimateSystemSpecPatchRow[],
  systemId: string,
): void => {
  const seen = new Set<string>();

  for (const spec of specs) {
    if (seen.has(spec.system_spec_def_id)) {
      throw new ValidationError("Duplicate system_spec_def_id in specs", {
        field: "systems",
        code: "duplicate_spec",
        system_id: systemId,
        system_spec_def_id: spec.system_spec_def_id,
      });
    }
    seen.add(spec.system_spec_def_id);
  }
};

const assertCatalogSystemExists = async (
  client: PoolClient,
  systemId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM system WHERE id = $1`,
    [systemId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Unknown system_id in systems", {
      field: "systems",
      code: "unknown_system",
      system_id: systemId,
    });
  }
};

const assertSpecDefBelongsToSystem = async (
  client: PoolClient,
  systemId: string,
  specDefId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM system_spec_def WHERE id = $1 AND system_id = $2`,
    [specDefId, systemId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("system_spec_def_id does not belong to catalog system", {
      field: "systems",
      code: "invalid_spec_def",
      system_id: systemId,
      system_spec_def_id: specDefId,
    });
  }
};

const assertSpecOptionBelongsToDef = async (
  client: PoolClient,
  specDefId: string,
  optionId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM system_spec_option WHERE id = $1 AND system_spec_def_id = $2`,
    [optionId, specDefId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("system_spec_option_id does not belong to spec def", {
      field: "systems",
      code: "invalid_spec_option",
      system_spec_def_id: specDefId,
      system_spec_option_id: optionId,
    });
  }
};

const assertSystemBlockOwnedByEstimate = async (
  client: PoolClient,
  estimateId: string,
  blockId: string,
): Promise<void> => {
  const result = await client.query<{ estimate_id: string }>(
    `SELECT estimate_id FROM estimate_system WHERE id = $1`,
    [blockId],
  );

  if (result.rows.length === 0) {
    return;
  }

  if (result.rows[0]?.estimate_id !== estimateId) {
    throw new ValidationError("estimate_system id belongs to another estimate", {
      field: "systems",
      code: "foreign_block",
      id: blockId,
    });
  }
};

export const loadEstimateSystemBlockIds = async (
  client: PoolClient,
  estimateId: string,
): Promise<Set<string>> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM estimate_system WHERE estimate_id = $1`,
    [estimateId],
  );

  return new Set(result.rows.map((row) => row.id));
};

export const replaceEstimateSystemsTx = async (
  client: PoolClient,
  estimateId: string,
  rows: EstimateSystemPatchRow[],
): Promise<Set<string>> => {
  assertNoDuplicateSystemIds(rows);

  const normalized = rows.map((row) => ({
    ...row,
    id: row.id ?? crypto.randomUUID(),
  }));

  for (const row of normalized) {
    await assertCatalogSystemExists(client, row.system_id);
    assertNoDuplicateSpecDefs(row.specs, row.system_id);

    if (row.id) {
      await assertSystemBlockOwnedByEstimate(client, estimateId, row.id);
    }

    for (const spec of row.specs) {
      await assertSpecDefBelongsToSystem(
        client,
        row.system_id,
        spec.system_spec_def_id,
      );

      if (
        spec.system_spec_option_id !== null &&
        spec.system_spec_option_id !== undefined
      ) {
        await assertSpecOptionBelongsToDef(
          client,
          spec.system_spec_def_id,
          spec.system_spec_option_id,
        );
      }
    }
  }

  const existing = await client.query<{ id: string }>(
    `SELECT id FROM estimate_system WHERE estimate_id = $1`,
    [estimateId],
  );
  const payloadIds = new Set(normalized.map((row) => row.id));
  const toDelete = existing.rows
    .map((row) => row.id)
    .filter((id) => !payloadIds.has(id));

  if (toDelete.length > 0) {
    await client.query(
      `DELETE FROM estimate_system
       WHERE estimate_id = $1
         AND id = ANY($2::text[])`,
      [estimateId, toDelete],
    );
  }

  const existingIds = new Set(existing.rows.map((row) => row.id));

  for (const row of normalized) {
    if (existingIds.has(row.id)) {
      await client.query(
        `UPDATE estimate_system
         SET system_id = $2,
             sort_order = $3,
             site_system_id = NULL
         WHERE id = $1
           AND estimate_id = $4`,
        [row.id, row.system_id, row.sort_order, estimateId],
      );
    } else {
      await client.query(
        `INSERT INTO estimate_system (
           id,
           estimate_id,
           system_id,
           site_system_id,
           sort_order
         )
         VALUES ($1, $2, $3, NULL, $4)`,
        [row.id, estimateId, row.system_id, row.sort_order],
      );
    }

    await client.query(`DELETE FROM estimate_system_spec WHERE estimate_system_id = $1`, [
      row.id,
    ]);

    for (const spec of row.specs) {
      await client.query(
        `INSERT INTO estimate_system_spec (
           estimate_system_id,
           system_spec_def_id,
           system_spec_option_id,
           value_text,
           value_boolean
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          row.id,
          spec.system_spec_def_id,
          spec.system_spec_option_id ?? null,
          spec.value_text ?? null,
          spec.value_boolean ?? null,
        ],
      );
    }
  }

  return new Set(normalized.map((row) => row.id));
};

export const replaceEstimateSystems = async (
  pool: Pool,
  actorId: string,
  estimateId: string,
  rows: EstimateSystemPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceEstimateSystemsTx(client, estimateId, rows);
  });
};
