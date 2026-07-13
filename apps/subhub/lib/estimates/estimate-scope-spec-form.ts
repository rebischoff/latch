import {
  specValueToCanonical,
  specValueToDisplay,
  type SpecUnitDisplayMeta,
} from "@/lib/catalog/spec-units";

export type EstimateScopeSpecUnitRow = {
  decimal_places?: number | null;
  def_display_name?: string;
  option_display_name?: string | null;
  options?: Array<{ display_name: string; id: string }>;
  presets?: Array<{
    id: string;
    label: string;
    option_ids: string[];
    sort_order: number;
    value_number: number | null;
    value_number_max: number | null;
  }>;
  spec_def_id: string;
  spec_option_id: string | null;
  spec_threshold_preset_id?: string | null;
  to_canonical_factor?: number;
  unit_symbol?: string | null;
  value_boolean: boolean | null;
  value_number: number | null;
  value_number_max?: number | null;
  value_type?: "enum" | "boolean" | "number";
};

const unitMetaFromRow = (row: EstimateScopeSpecUnitRow): SpecUnitDisplayMeta => ({
  decimal_places: row.decimal_places,
  to_canonical_factor: row.to_canonical_factor,
  unit_symbol: row.unit_symbol,
});

/** Convert stored canonical bucket values to display units for form inputs. */
export const estimateScopeSpecsToDisplay = <T extends EstimateScopeSpecUnitRow>(
  rows: T[],
): T[] =>
  rows.map((row) => {
    if (row.value_type !== "number") {
      return row;
    }

    const unitMeta = unitMetaFromRow(row);
    return {
      ...row,
      value_number: specValueToDisplay(row.value_number, unitMeta),
      value_number_max: specValueToDisplay(row.value_number_max ?? null, unitMeta),
    };
  });

/** Convert authored display values to canonical for PATCH bodies. */
export const estimateScopeSpecToPatchBody = (
  row: EstimateScopeSpecUnitRow,
): {
  spec_def_id: string;
  spec_option_id: string | null;
  spec_threshold_preset_id: string | null;
  value_boolean: boolean | null;
  value_number: number | null;
  value_number_max: number | null;
} => {
  const unitMeta = unitMetaFromRow(row);

  return {
    spec_def_id: row.spec_def_id,
    spec_option_id: row.spec_option_id,
    spec_threshold_preset_id: row.spec_threshold_preset_id ?? null,
    value_boolean: row.value_boolean,
    value_number:
      row.value_type === "number"
        ? specValueToCanonical(row.value_number, unitMeta)
        : row.value_number,
    value_number_max:
      row.value_type === "number"
        ? specValueToCanonical(row.value_number_max ?? null, unitMeta)
        : (row.value_number_max ?? null),
  };
};
