import { ConflictError, ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";

import type { SpecDefinitionPatchRow } from "../descriptors/item-detail";
import {
  assertSpecDefTypeUnitMutable,
  assertSpecDefinitionShape,
  assertSpecOptionDeletable,
  assertSpecPresetsShape,
  type SpecThresholdPresetPatchRow,
} from "./spec-detail-write";

export const assertScopeSpecDefinitionsPatch = (nodeType: string): void => {
  if (nodeType !== "scope") {
    throw new ValidationError("spec_definitions is scope-only", {
      field: "spec_definitions",
      code: "scope_only_field",
    });
  }
};

const loadSpecDefInUseCounts = async (
  client: PoolClient,
  specDefId: string,
): Promise<{ parts: number }> => {
  const partResult = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM manufacturer_part_spec
     WHERE spec_def_id = $1`,
    [specDefId],
  );

  return {
    parts: partResult.rows[0]?.count ?? 0,
  };
};

const assertSpecDefDeletable = async (
  client: PoolClient,
  specDefId: string,
): Promise<void> => {
  const counts = await loadSpecDefInUseCounts(client, specDefId);
  if (counts.parts > 0) {
    throw new ConflictError("Cannot delete spec definition in use", {
      code: "in_use",
      in_use_part_count: counts.parts,
    });
  }
};

const deleteSpecOptionsForDefTx = async (
  client: PoolClient,
  specDefId: string,
): Promise<void> => {
  const existingResult = await client.query<{ id: string }>(
    `SELECT id::text FROM spec_option WHERE spec_def_id = $1`,
    [specDefId],
  );
  for (const row of existingResult.rows) {
    await assertSpecOptionDeletable(client, row.id);
  }
  await client.query(`DELETE FROM spec_option WHERE spec_def_id = $1`, [specDefId]);
};

const upsertSpecOptionsTx = async (
  client: PoolClient,
  defId: string,
  options: SpecDefinitionPatchRow["options"],
): Promise<void> => {
  const existingResult = await client.query<{ id: string }>(
    `SELECT id::text FROM spec_option WHERE spec_def_id = $1`,
    [defId],
  );
  const existingIds = new Set(existingResult.rows.map((row) => row.id));
  const payloadIds = new Set(options.filter((option) => option.id).map((option) => option.id!));
  const removedIds = [...existingIds].filter((id) => !payloadIds.has(id));

  for (const optionId of removedIds) {
    await assertSpecOptionDeletable(client, optionId);
  }

  for (const [optionIndex, option] of options.entries()) {
    const optionId = option.id ?? crypto.randomUUID();
    await client.query(
      `INSERT INTO spec_option (id, spec_def_id, display_name, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         sort_order = EXCLUDED.sort_order`,
      [optionId, defId, option.display_name, option.sort_order ?? optionIndex + 1],
    );
  }

  for (const optionId of removedIds) {
    await client.query(`DELETE FROM spec_option WHERE id = $1`, [optionId]);
  }
};

const countBucketPresetReferences = async (
  client: PoolClient,
  presetId: string,
): Promise<number> => {
  const result = await client.query<{ count: number }>(
    `SELECT (
       (SELECT COUNT(*)::int FROM estimate_condition_spec WHERE spec_threshold_preset_id = $1)
       + (SELECT COUNT(*)::int FROM estimate_line_spec WHERE spec_threshold_preset_id = $1)
     ) AS count`,
    [presetId],
  );
  return result.rows[0]?.count ?? 0;
};

const assertSpecPresetDeletable = async (
  client: PoolClient,
  presetId: string,
): Promise<void> => {
  const bucketCount = await countBucketPresetReferences(client, presetId);
  if (bucketCount > 0) {
    throw new ValidationError(
      `${bucketCount} estimate bucket row(s) use this threshold preset — update those estimates first`,
      {
        field: "presets",
        code: "spec_preset_in_use",
        spec_threshold_preset_id: presetId,
        bucket_count: bucketCount,
      },
    );
  }
};

const deleteSpecPresetsForDefTx = async (
  client: PoolClient,
  specDefId: string,
): Promise<void> => {
  const existingResult = await client.query<{ id: string }>(
    `SELECT id::text FROM spec_threshold_preset WHERE spec_def_id = $1`,
    [specDefId],
  );
  for (const row of existingResult.rows) {
    await assertSpecPresetDeletable(client, row.id);
  }
  await client.query(`DELETE FROM spec_threshold_preset WHERE spec_def_id = $1`, [specDefId]);
};

const upsertSpecPresetOptionsTx = async (
  client: PoolClient,
  presetId: string,
  optionIds: string[],
): Promise<void> => {
  const existingResult = await client.query<{ spec_option_id: string }>(
    `SELECT spec_option_id::text FROM spec_threshold_preset_option WHERE preset_id = $1`,
    [presetId],
  );
  const existingIds = new Set(existingResult.rows.map((row) => row.spec_option_id));
  const payloadIds = new Set(optionIds);
  const removedIds = [...existingIds].filter((id) => !payloadIds.has(id));
  const addedIds = [...payloadIds].filter((id) => !existingIds.has(id));

  for (const optionId of removedIds) {
    await client.query(
      `DELETE FROM spec_threshold_preset_option
       WHERE preset_id = $1 AND spec_option_id = $2`,
      [presetId, optionId],
    );
  }

  for (const optionId of addedIds) {
    await client.query(
      `INSERT INTO spec_threshold_preset_option (preset_id, spec_option_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [presetId, optionId],
    );
  }
};

const upsertSpecPresetsTx = async (
  client: PoolClient,
  defId: string,
  valueType: string,
  presets: SpecThresholdPresetPatchRow[],
  allowedOptionIds: Set<string>,
): Promise<void> => {
  assertSpecPresetsShape(valueType, presets, allowedOptionIds);

  const existingResult = await client.query<{ id: string }>(
    `SELECT id::text FROM spec_threshold_preset WHERE spec_def_id = $1`,
    [defId],
  );
  const existingIds = new Set(existingResult.rows.map((row) => row.id));
  const payloadIds = new Set(presets.filter((preset) => preset.id).map((preset) => preset.id!));
  const removedIds = [...existingIds].filter((id) => !payloadIds.has(id));

  for (const presetId of removedIds) {
    await assertSpecPresetDeletable(client, presetId);
  }

  for (const [presetIndex, preset] of presets.entries()) {
    const presetId = preset.id ?? crypto.randomUUID();
    await client.query(
      `INSERT INTO spec_threshold_preset (
         id, spec_def_id, label, sort_order, value_number, value_number_max
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         label = EXCLUDED.label,
         sort_order = EXCLUDED.sort_order,
         value_number = EXCLUDED.value_number,
         value_number_max = EXCLUDED.value_number_max`,
      [
        presetId,
        defId,
        preset.label,
        preset.sort_order ?? presetIndex + 1,
        valueType === "number" ? (preset.value_number ?? null) : null,
        valueType === "number" ? (preset.value_number_max ?? null) : null,
      ],
    );

    if (valueType === "enum") {
      await upsertSpecPresetOptionsTx(client, presetId, preset.option_ids ?? []);
    } else {
      await client.query(
        `DELETE FROM spec_threshold_preset_option WHERE preset_id = $1`,
        [presetId],
      );
    }
  }

  for (const presetId of removedIds) {
    await client.query(`DELETE FROM spec_threshold_preset WHERE id = $1`, [presetId]);
  }
};

const deleteSpecDefinitionTx = async (
  client: PoolClient,
  specDefId: string,
): Promise<void> => {
  await assertSpecDefDeletable(client, specDefId);
  await deleteSpecPresetsForDefTx(client, specDefId);
  await client.query(`DELETE FROM spec_option WHERE spec_def_id = $1`, [specDefId]);
  await client.query(`DELETE FROM spec_def WHERE id = $1`, [specDefId]);
};

const upsertSpecDefinitionTx = async (
  client: PoolClient,
  scopeRootId: string,
  row: SpecDefinitionPatchRow,
  defId: string,
  sortOrder: number,
): Promise<void> => {
  assertSpecDefinitionShape(row.value_type, row.options, row.unit_id);

  const existingResult = await client.query<{
    unit_id: string | null;
    value_type: string;
  }>(
    `SELECT value_type, unit_id FROM spec_def WHERE id = $1`,
    [defId],
  );
  const existing = existingResult.rows[0];
  if (existing) {
    await assertSpecDefTypeUnitMutable(
      client,
      defId,
      row.value_type,
      row.unit_id,
      existing,
    );
  }

  await client.query(
    `INSERT INTO spec_def (
       id, scope_root_item_id, display_name, value_type, unit_id, decimal_places, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       value_type = EXCLUDED.value_type,
       unit_id = EXCLUDED.unit_id,
       decimal_places = EXCLUDED.decimal_places,
       sort_order = EXCLUDED.sort_order`,
    [
      defId,
      scopeRootId,
      row.display_name,
      row.value_type,
      row.unit_id ?? null,
      row.decimal_places ?? null,
      row.sort_order ?? sortOrder,
    ],
  );

  if (row.value_type === "enum") {
    await upsertSpecOptionsTx(client, defId, row.options);
    const persistedOptions = await client.query<{ id: string }>(
      `SELECT id::text FROM spec_option WHERE spec_def_id = $1`,
      [defId],
    );
    const allowedOptionIds = new Set(persistedOptions.rows.map((option) => option.id));
    await upsertSpecPresetsTx(client, defId, row.value_type, row.presets, allowedOptionIds);
  } else if (row.value_type === "number") {
    await deleteSpecOptionsForDefTx(client, defId);
    await upsertSpecPresetsTx(client, defId, row.value_type, row.presets, new Set());
  } else {
    await deleteSpecOptionsForDefTx(client, defId);
    await deleteSpecPresetsForDefTx(client, defId);
  }
};

/**
 * Replace the spec definitions in a scope root's flat namespace from `rows`.
 */
export const replaceScopeSpecDefinitionsTx = async (
  client: PoolClient,
  scopeRootId: string,
  rows: SpecDefinitionPatchRow[],
): Promise<string[]> => {
  const existingResult = await client.query<{ id: string }>(
    `SELECT id FROM spec_def WHERE scope_root_item_id = $1`,
    [scopeRootId],
  );
  const existingIds = new Set(existingResult.rows.map((row) => row.id));
  const payloadIds = new Set(rows.filter((row) => row.id).map((row) => row.id!));

  const removedDefIds = [...existingIds].filter((id) => !payloadIds.has(id));
  for (const specDefId of removedDefIds) {
    await deleteSpecDefinitionTx(client, specDefId);
  }

  const referencedIds = rows.filter((row) => row.id).map((row) => row.id!);
  if (referencedIds.length > 0) {
    const ownerResult = await client.query<{ id: string; scope_root_item_id: string }>(
      `SELECT id, scope_root_item_id FROM spec_def WHERE id = ANY($1::uuid[])`,
      [referencedIds],
    );
    for (const def of ownerResult.rows) {
      if (def.scope_root_item_id !== scopeRootId) {
        throw new ValidationError("Spec definition does not belong to this scope", {
          field: "spec_definitions",
          code: "wrong_scope",
          spec_def_id: def.id,
        });
      }
    }
  }

  const newDefIds: string[] = [];
  for (const [index, row] of rows.entries()) {
    const defId = row.id ?? crypto.randomUUID();
    if (!row.id) {
      newDefIds.push(defId);
    }
    await upsertSpecDefinitionTx(client, scopeRootId, row, defId, index + 1);
  }

  return newDefIds;
};

export const applyScopeSpecDefinitionsTx = async (
  client: PoolClient,
  category: { id: string; node_type: string },
  rows: SpecDefinitionPatchRow[],
): Promise<void> => {
  assertScopeSpecDefinitionsPatch(category.node_type);
  await replaceScopeSpecDefinitionsTx(client, category.id, rows);
};
