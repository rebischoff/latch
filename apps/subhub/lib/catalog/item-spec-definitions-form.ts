import { specValueToCanonical, type SpecUnitDisplayMeta } from "./spec-units";

export type SpecDefinitionFormOption = {
  display_name: string;
  id?: string;
  sort_order?: number;
};

export type SpecThresholdPresetFormRow = {
  id?: string;
  label: string;
  option_ids?: string[];
  sort_order?: number;
  value_number?: number | null;
  value_number_max?: number | null;
};

export type SpecDefinitionFormRow = {
  decimal_places?: number | null;
  display_name: string;
  id?: string;
  options: SpecDefinitionFormOption[];
  presets?: SpecThresholdPresetFormRow[];
  sort_order?: number;
  to_canonical_factor?: number | null;
  unit_id?: string | null;
  unit_symbol?: string | null;
  value_type: "boolean" | "enum" | "number";
};

export type SpecThresholdPresetPatchBodyRow = {
  id?: string;
  label: string;
  option_ids?: string[];
  sort_order: number;
  value_number?: number | null;
  value_number_max?: number | null;
};

export type SpecDefinitionPatchBodyRow = {
  decimal_places: number | null;
  display_name: string;
  id?: string;
  options: Array<{
    display_name: string;
    id?: string;
    sort_order: number;
  }>;
  presets: SpecThresholdPresetPatchBodyRow[];
  sort_order: number;
  unit_id: string | null;
  value_type: "boolean" | "enum" | "number";
};

const unitMetaFromRow = (row: SpecDefinitionFormRow): SpecUnitDisplayMeta => ({
  decimal_places: row.decimal_places,
  to_canonical_factor: row.to_canonical_factor ?? undefined,
  unit_symbol: row.unit_symbol,
});

const toPresetPatchRow = (
  preset: SpecThresholdPresetFormRow,
  presetIndex: number,
  valueType: SpecDefinitionFormRow["value_type"],
  unitMeta: SpecUnitDisplayMeta,
): SpecThresholdPresetPatchBodyRow => {
  if (valueType === "enum") {
    return {
      ...(preset.id ? { id: preset.id } : {}),
      label: preset.label,
      sort_order: preset.sort_order ?? presetIndex + 1,
      option_ids: preset.option_ids ?? [],
    };
  }

  if (valueType === "number") {
    return {
      ...(preset.id ? { id: preset.id } : {}),
      label: preset.label,
      sort_order: preset.sort_order ?? presetIndex + 1,
      value_number: specValueToCanonical(preset.value_number, unitMeta),
      value_number_max: specValueToCanonical(preset.value_number_max, unitMeta),
    };
  }

  return {
    ...(preset.id ? { id: preset.id } : {}),
    label: preset.label,
    sort_order: preset.sort_order ?? presetIndex + 1,
  };
};

/**
 * Map a Specs-tab form row to PATCH shape. Form state may retain Details from a
 * prior type during before-save round-trips; only fields valid for `value_type`
 * are emitted (server `assertSpecDefinitionShape`).
 */
export const toSpecDefinitionPatchRow = (
  row: SpecDefinitionFormRow,
  index: number,
): SpecDefinitionPatchBodyRow => {
  const valueType = row.value_type;
  const options =
    valueType === "enum"
      ? row.options.map((option, optionIndex) => ({
          ...(option.id ? { id: option.id } : {}),
          display_name: option.display_name,
          sort_order: option.sort_order ?? optionIndex + 1,
        }))
      : [];

  const unitMeta = unitMetaFromRow(row);
  const presets =
    valueType === "enum" || valueType === "number"
      ? (row.presets ?? []).map((preset, presetIndex) =>
          toPresetPatchRow(preset, presetIndex, valueType, unitMeta),
        )
      : [];

  return {
    ...(row.id ? { id: row.id } : {}),
    display_name: row.display_name,
    value_type: valueType,
    unit_id: valueType === "number" ? (row.unit_id ?? null) : null,
    decimal_places: valueType === "number" ? (row.decimal_places ?? null) : null,
    sort_order: row.sort_order ?? index + 1,
    options,
    presets,
  };
};
