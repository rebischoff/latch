export type SpecDefinitionFormOption = {
  display_name: string;
  id?: string;
  sort_order?: number;
};

export type SpecDefinitionFormRow = {
  decimal_places?: number | null;
  display_name: string;
  id?: string;
  options: SpecDefinitionFormOption[];
  sort_order?: number;
  unit_id?: string | null;
  value_type: "boolean" | "enum" | "number";
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
  sort_order: number;
  unit_id: string | null;
  value_type: "boolean" | "enum" | "number";
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

  return {
    ...(row.id ? { id: row.id } : {}),
    display_name: row.display_name,
    value_type: valueType,
    unit_id: valueType === "number" ? (row.unit_id ?? null) : null,
    decimal_places: valueType === "number" ? (row.decimal_places ?? null) : null,
    sort_order: row.sort_order ?? index + 1,
    options,
  };
};
