import type { Pool, PoolClient } from "pg";

import type { SpecThresholdPresetRow } from "@/lib/catalog/descriptors/item-detail";
import { specValueToDisplay, type SpecUnitDisplayMeta } from "@/lib/catalog/spec-units";
import type { ThresholdPresetMatchMeta } from "@/lib/catalog/spec-match";

type SpecDefUnitMeta = {
  decimal_places: number | null;
  id: string;
  to_canonical_factor: number | null;
  unit_symbol: string | null;
  value_type: "boolean" | "enum" | "number";
};

type SpecThresholdPresetDbRow = {
  id: string;
  label: string;
  sort_order: number;
  spec_def_id: string;
  value_number: string | null;
  value_number_max: string | null;
};

const loadSpecPresetOptionsByPresetIds = async (
  client: Pool | PoolClient,
  presetIds: string[],
): Promise<Map<string, string[]>> => {
  if (presetIds.length === 0) {
    return new Map();
  }

  const result = await client.query<{ preset_id: string; spec_option_id: string }>(
    `SELECT preset_id, spec_option_id
     FROM spec_threshold_preset_option
     WHERE preset_id = ANY($1::uuid[])
     ORDER BY spec_option_id ASC`,
    [presetIds],
  );

  const byPresetId = new Map<string, string[]>();
  for (const row of result.rows) {
    const optionIds = byPresetId.get(row.preset_id) ?? [];
    optionIds.push(row.spec_option_id);
    byPresetId.set(row.preset_id, optionIds);
  }

  return byPresetId;
};

export const loadSpecPresetsByDefIds = async (
  pool: Pool,
  defs: SpecDefUnitMeta[],
): Promise<Map<string, SpecThresholdPresetRow[]>> => {
  const defIds = defs.map((def) => def.id);
  if (defIds.length === 0) {
    return new Map();
  }

  const result = await pool.query<SpecThresholdPresetDbRow>(
    `SELECT id, spec_def_id, label, sort_order, value_number::text, value_number_max::text
     FROM spec_threshold_preset
     WHERE spec_def_id = ANY($1::uuid[])
     ORDER BY sort_order ASC, label ASC, id ASC`,
    [defIds],
  );

  if (result.rows.length === 0) {
    return new Map();
  }

  const presetIds = result.rows.map((row) => row.id);
  const optionsByPresetId = await loadSpecPresetOptionsByPresetIds(pool, presetIds);
  const defMetaById = new Map(defs.map((def) => [def.id, def]));

  const byDefId = new Map<string, SpecThresholdPresetRow[]>();
  for (const row of result.rows) {
    const defMeta = defMetaById.get(row.spec_def_id);
    const unitMeta: SpecUnitDisplayMeta = {
      decimal_places: defMeta?.decimal_places,
      to_canonical_factor: defMeta?.to_canonical_factor ?? 1,
      unit_symbol: defMeta?.unit_symbol,
    };
    const presets = byDefId.get(row.spec_def_id) ?? [];
    presets.push({
      id: row.id,
      label: row.label,
      sort_order: row.sort_order,
      value_number:
        row.value_number !== null
          ? specValueToDisplay(Number(row.value_number), unitMeta)
          : null,
      value_number_max:
        row.value_number_max !== null
          ? specValueToDisplay(Number(row.value_number_max), unitMeta)
          : null,
      option_ids: optionsByPresetId.get(row.id) ?? [],
    });
    byDefId.set(row.spec_def_id, presets);
  }

  return byDefId;
};

/** Canonical preset metadata for bucket/part matching. */
export const loadThresholdPresetsByIds = async (
  client: Pool | PoolClient,
  presetIds: string[],
): Promise<Map<string, ThresholdPresetMatchMeta>> => {
  if (presetIds.length === 0) {
    return new Map();
  }

  const result = await client.query<{
    id: string;
    spec_def_id: string;
    value_number: string | null;
    value_number_max: string | null;
  }>(
    `SELECT id, spec_def_id, value_number::text, value_number_max::text
     FROM spec_threshold_preset
     WHERE id = ANY($1::uuid[])`,
    [presetIds],
  );

  const optionsByPresetId = await loadSpecPresetOptionsByPresetIds(
    client,
    result.rows.map((row) => row.id),
  );

  return new Map(
    result.rows.map((row) => [
      row.id,
      {
        id: row.id,
        spec_def_id: row.spec_def_id,
        option_ids: optionsByPresetId.get(row.id) ?? [],
        value_number: row.value_number !== null ? Number(row.value_number) : null,
        value_number_max:
          row.value_number_max !== null ? Number(row.value_number_max) : null,
      },
    ]),
  );
};
