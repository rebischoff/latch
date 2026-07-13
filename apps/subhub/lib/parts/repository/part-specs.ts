import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { rootNamespaceForItems } from "../../catalog/repository/item-effective-specs";
import { tableExists } from "../../sites/repository/sql-utils";
import { loadItemLinks } from "./part-item-links";

export type PartSpecRow = {
  code: string;
  decimal_places: number | null;
  display_name: string;
  option_display_name: string | null;
  spec_def_id: string;
  spec_option_id: string | null;
  to_canonical_factor: number;
  unit_symbol: string | null;
  value_boolean: boolean | null;
  value_number: number | null;
  value_number_max: number | null;
  value_type: "boolean" | "enum" | "number";
};

export type PartSpecPatchRow = {
  spec_def_id: string;
  spec_option_id?: string | null;
  value_boolean?: boolean | null;
  value_number?: number | null;
  value_number_max?: number | null;
};

export type PartSpecContextDef = {
  code: string;
  decimal_places: number | null;
  display_name: string;
  options: Array<{ id: string; code: string; display_name: string }>;
  spec_def_id: string;
  to_canonical_factor: number;
  unit_symbol: string | null;
  value_type: "boolean" | "enum" | "number";
};

const loadContextDefsForItemIds = async (
  pool: Pool | PoolClient,
  itemIds: string[],
): Promise<PartSpecContextDef[]> => {
  if (itemIds.length === 0) {
    return [];
  }

  const effectiveDefs = await rootNamespaceForItems(pool as Pool, itemIds);
  const specDefIds = effectiveDefs.map((def) => def.spec_def_id);
  if (specDefIds.length === 0) {
    return [];
  }

  const [defMetaResult, optionResult] = await Promise.all([
    pool.query<{
      decimal_places: number | null;
      display_name: string;
      id: string;
      to_canonical_factor: string;
      unit_symbol: string | null;
      value_type: string;
    }>(
      `SELECT sd.id::text,
              sd.display_name,
              sd.value_type,
              sd.decimal_places,
              su.symbol AS unit_symbol,
              COALESCE(su.to_canonical_factor, 1) AS to_canonical_factor
       FROM spec_def sd
       LEFT JOIN spec_unit su ON su.id = sd.unit_id
       WHERE sd.id = ANY($1::uuid[])
       ORDER BY sd.sort_order ASC, sd.display_name ASC, sd.id ASC`,
      [specDefIds],
    ),
    pool.query<{
      id: string;
      spec_def_id: string;
      display_name: string;
    }>(
      `SELECT id::text, spec_def_id::text, display_name
       FROM spec_option
       WHERE spec_def_id = ANY($1::uuid[])
       ORDER BY sort_order ASC, display_name ASC, id ASC`,
      [specDefIds],
    ),
  ]);

  const optionsByDef = new Map<string, PartSpecContextDef["options"]>();
  for (const option of optionResult.rows) {
    const bucket = optionsByDef.get(option.spec_def_id) ?? [];
    bucket.push({
      id: option.id,
      code: option.id,
      display_name: option.display_name,
    });
    optionsByDef.set(option.spec_def_id, bucket);
  }

  return defMetaResult.rows.map((row) => ({
    spec_def_id: row.id,
    code: row.id,
    display_name: row.display_name,
    value_type: row.value_type as PartSpecContextDef["value_type"],
    decimal_places: row.decimal_places,
    unit_symbol: row.unit_symbol,
    to_canonical_factor: Number(row.to_canonical_factor),
    options: optionsByDef.get(row.id) ?? [],
  }));
};

export const listDefsForPart = async (
  pool: Pool | PoolClient,
  partId: string,
): Promise<PartSpecContextDef[]> => {
  const links = await loadItemLinks(pool, partId);
  if (links.length === 0) {
    return [];
  }

  return loadContextDefsForItemIds(
    pool,
    links.map((row) => row.item_id),
  );
};

export const listDefsForItemIds = async (
  pool: Pool,
  itemIds: string[],
): Promise<PartSpecContextDef[]> => loadContextDefsForItemIds(pool, itemIds);

export const loadPartSpecs = async (
  pool: Pool | PoolClient,
  partId: string,
): Promise<PartSpecRow[]> => {
  if (!(await tableExists(pool, "manufacturer_part_spec"))) {
    return [];
  }

  const result = await pool.query<{
    decimal_places: number | null;
    display_name: string;
    option_display_name: string | null;
    spec_def_id: string;
    spec_option_id: string | null;
    to_canonical_factor: string;
    unit_symbol: string | null;
    value_boolean: boolean | null;
    value_number: string | null;
    value_number_max: string | null;
    value_type: string;
  }>(
    `SELECT mps.spec_def_id::text,
            sd.display_name,
            sd.value_type,
            sd.decimal_places,
            su.symbol AS unit_symbol,
            COALESCE(su.to_canonical_factor, 1) AS to_canonical_factor,
            mps.spec_option_id::text,
            so.display_name AS option_display_name,
            mps.value_boolean,
            mps.value_number,
            mps.value_number_max
     FROM manufacturer_part_spec mps
     INNER JOIN spec_def sd ON sd.id = mps.spec_def_id
     LEFT JOIN spec_unit su ON su.id = sd.unit_id
     LEFT JOIN spec_option so ON so.id = mps.spec_option_id
     WHERE mps.manufacturer_part_id = $1
     ORDER BY sd.sort_order ASC, sd.display_name ASC, so.sort_order ASC NULLS FIRST, mps.spec_option_id ASC`,
    [partId],
  );

  return result.rows.map((row) => ({
    spec_def_id: row.spec_def_id,
    code: row.spec_def_id,
    display_name: row.display_name,
    value_type: row.value_type as PartSpecRow["value_type"],
    spec_option_id: row.spec_option_id,
    option_display_name: row.option_display_name,
    value_boolean: row.value_boolean,
    value_number: row.value_number === null ? null : Number(row.value_number),
    value_number_max:
      row.value_number_max === null ? null : Number(row.value_number_max),
    decimal_places: row.decimal_places,
    unit_symbol: row.unit_symbol,
    to_canonical_factor: Number(row.to_canonical_factor),
  }));
};

const assertValidPartSpecs = async (
  client: PoolClient,
  partId: string,
  rows: PartSpecPatchRow[],
): Promise<void> => {
  const allowedDefs = await listDefsForPart(client, partId);
  const allowedById = new Map(allowedDefs.map((def) => [def.spec_def_id, def]));

  const enumSeen = new Set<string>();
  const scalarSeen = new Set<string>();

  for (const row of rows) {
    const meta = allowedById.get(row.spec_def_id);
    if (!meta) {
      throw new ValidationError("spec_def_id is not allowed for this part's item links", {
        field: "part_specs",
        code: "unknown_spec_def",
        spec_def_id: row.spec_def_id,
      });
    }

    if (meta.value_type === "enum") {
      const optionId = row.spec_option_id ?? null;
      if (!optionId) {
        throw new ValidationError("spec_option_id is required for enum part specs", {
          field: "part_specs",
          code: "required_option",
          spec_def_id: row.spec_def_id,
        });
      }

      if (!meta.options.some((option) => option.id === optionId)) {
        throw new ValidationError("spec_option_id is not valid for this spec definition", {
          field: "part_specs",
          code: "invalid_option",
          spec_def_id: row.spec_def_id,
          spec_option_id: optionId,
        });
      }

      const enumKey = `${row.spec_def_id}:${optionId}`;
      if (enumSeen.has(enumKey)) {
        throw new ValidationError("Duplicate enum option in part_specs", {
          field: "part_specs",
          code: "duplicate",
          spec_def_id: row.spec_def_id,
          spec_option_id: optionId,
        });
      }
      enumSeen.add(enumKey);

      if (row.value_number !== undefined && row.value_number !== null) {
        throw new ValidationError("value_number is not allowed for enum part specs", {
          field: "part_specs",
          code: "invalid_value",
          spec_def_id: row.spec_def_id,
        });
      }
      if (row.value_boolean !== undefined && row.value_boolean !== null) {
        throw new ValidationError("value_boolean is not allowed for enum part specs", {
          field: "part_specs",
          code: "invalid_value",
          spec_def_id: row.spec_def_id,
        });
      }
      continue;
    }

    if (scalarSeen.has(row.spec_def_id)) {
      throw new ValidationError("Duplicate spec definition in part_specs", {
        field: "part_specs",
        code: "duplicate",
        spec_def_id: row.spec_def_id,
      });
    }
    scalarSeen.add(row.spec_def_id);

    if (meta.value_type === "boolean") {
      if (row.value_boolean === undefined || row.value_boolean === null) {
        throw new ValidationError("value_boolean is required for boolean part specs", {
          field: "part_specs",
          code: "required_boolean",
          spec_def_id: row.spec_def_id,
        });
      }
      if (row.spec_option_id !== undefined && row.spec_option_id !== null) {
        throw new ValidationError("spec_option_id is not allowed for boolean part specs", {
          field: "part_specs",
          code: "invalid_value",
          spec_def_id: row.spec_def_id,
        });
      }
      if (row.value_number !== undefined && row.value_number !== null) {
        throw new ValidationError("value_number is not allowed for boolean part specs", {
          field: "part_specs",
          code: "invalid_value",
          spec_def_id: row.spec_def_id,
        });
      }
      continue;
    }

    if (meta.value_type === "number") {
      if (row.value_number === undefined || row.value_number === null) {
        throw new ValidationError("value_number is required for number part specs", {
          field: "part_specs",
          code: "required_number",
          spec_def_id: row.spec_def_id,
        });
      }
      if (
        row.value_number_max !== undefined &&
        row.value_number_max !== null &&
        row.value_number > row.value_number_max
      ) {
        throw new ValidationError("Range min must be less than or equal to max", {
          field: "part_specs",
          code: "invalid_range",
          spec_def_id: row.spec_def_id,
        });
      }
    }
  }
};

/**
 * Remove `manufacturer_part_spec` rows whose `spec_def_id` is outside the
 * contextual union for the part's current item links (K1/K4).
 */
export const prunePartSpecsToContextTx = async (
  client: PoolClient,
  partId: string,
): Promise<number> => {
  if (!(await tableExists(client, "manufacturer_part_spec"))) {
    return 0;
  }

  const links = await loadItemLinks(client, partId);
  const itemIds = links.map((row) => row.item_id);

  if (itemIds.length === 0) {
    const result = await client.query(
      `DELETE FROM manufacturer_part_spec WHERE manufacturer_part_id = $1`,
      [partId],
    );
    return result.rowCount ?? 0;
  }

  const effectiveDefs = await rootNamespaceForItems(client as unknown as Pool, itemIds);
  const allowedDefIds = effectiveDefs.map((def) => def.spec_def_id);

  if (allowedDefIds.length === 0) {
    const result = await client.query(
      `DELETE FROM manufacturer_part_spec WHERE manufacturer_part_id = $1`,
      [partId],
    );
    return result.rowCount ?? 0;
  }

  const result = await client.query(
    `DELETE FROM manufacturer_part_spec
     WHERE manufacturer_part_id = $1
       AND spec_def_id != ALL($2::uuid[])`,
    [partId, allowedDefIds],
  );
  return result.rowCount ?? 0;
};

export const replacePartSpecsTx = async (
  client: PoolClient,
  partId: string,
  rows: PartSpecPatchRow[],
): Promise<void> => {
  await assertValidPartSpecs(client, partId, rows);

  await client.query(`DELETE FROM manufacturer_part_spec WHERE manufacturer_part_id = $1`, [
    partId,
  ]);

  await Promise.all(
    rows.map((row) =>
      client.query(
        `INSERT INTO manufacturer_part_spec (
           manufacturer_part_id,
           spec_def_id,
           spec_option_id,
           value_boolean,
           value_number,
           value_number_max
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          partId,
          row.spec_def_id,
          row.spec_option_id ?? null,
          row.value_boolean ?? null,
          row.value_number ?? null,
          row.value_number_max ?? null,
        ],
      ),
    ),
  );
};

export const replacePartSpecs = async (
  pool: Pool,
  actorId: string,
  partId: string,
  rows: PartSpecPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replacePartSpecsTx(client, partId, rows);
  });
};
