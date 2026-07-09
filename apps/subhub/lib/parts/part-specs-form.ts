import type { PartSpecDefPickerRow } from "@/lib/surface-api";
import {
  specValueToCanonical,
  specValueToDisplay,
  type SpecUnitDisplayMeta,
} from "@/lib/catalog/spec-units";

export type PartSpecFormRow = {
  code?: string;
  decimal_places?: number | null;
  display_name?: string;
  spec_def_id: string;
  spec_option_ids?: string[];
  to_canonical_factor?: number;
  unit_symbol?: string | null;
  value_boolean?: boolean | null;
  value_number?: number | null;
  value_number_max?: number | null;
  value_type?: "boolean" | "enum" | "number";
};

export type PartSpecPatchBodyRow = {
  spec_def_id: string;
  spec_option_id: string | null;
  value_boolean: boolean | null;
  value_number: number | null;
  value_number_max: number | null;
};

/** Collapse flat API rows (one per enum option) into one row per spec_def. */
export const collapsePartSpecRows = (rows: PartSpecFormRow[]): PartSpecFormRow[] => {
  const byDef = new Map<string, PartSpecFormRow>();

  for (const row of rows) {
    // RHF Controllers on part_specs.${i}.* can create sparse holes / empty shells
    // before the merge effect writes dense rows — skip those.
    if (!row?.spec_def_id) {
      continue;
    }

    const valueType = row.value_type ?? "boolean";

    if (valueType === "enum") {
      const optionId =
        row.spec_option_ids?.[0] ??
        (row as { spec_option_id?: string | null }).spec_option_id ??
        null;

      const existing = byDef.get(row.spec_def_id);
      if (existing) {
        const ids = new Set(existing.spec_option_ids ?? []);
        if (optionId) {
          ids.add(optionId);
        }
        for (const id of row.spec_option_ids ?? []) {
          ids.add(id);
        }
        existing.spec_option_ids = [...ids];
        continue;
      }

      const ids = new Set<string>();
      if (optionId) {
        ids.add(optionId);
      }
      for (const id of row.spec_option_ids ?? []) {
        ids.add(id);
      }

      byDef.set(row.spec_def_id, {
        spec_def_id: row.spec_def_id,
        code: row.code,
        display_name: row.display_name,
        value_type: "enum",
        spec_option_ids: [...ids],
        value_boolean: null,
        value_number: null,
        value_number_max: null,
      });
      continue;
    }

    byDef.set(row.spec_def_id, {
      spec_def_id: row.spec_def_id,
      code: row.code,
      display_name: row.display_name,
      value_type: valueType,
      spec_option_ids: [],
      value_boolean: row.value_boolean ?? null,
      value_number: row.value_number ?? null,
      value_number_max: row.value_number_max ?? null,
    });
  }

  return [...byDef.values()];
};

const unitMetaFromDef = (def: PartSpecDefPickerRow): SpecUnitDisplayMeta => ({
  decimal_places: def.decimal_places,
  to_canonical_factor: def.to_canonical_factor,
  unit_symbol: def.unit_symbol,
});

const unitMetaFromRow = (row: PartSpecFormRow): SpecUnitDisplayMeta => ({
  decimal_places: row.decimal_places,
  to_canonical_factor: row.to_canonical_factor,
  unit_symbol: row.unit_symbol,
});

const defaultRowForDef = (
  def: PartSpecDefPickerRow,
  saved: PartSpecFormRow | undefined,
): PartSpecFormRow => {
  const unitMeta = unitMetaFromDef(def);

  if (def.value_type === "enum") {
    const validOptionIds = new Set(def.options.map((option) => option.id));
    const savedIds = (saved?.spec_option_ids ?? []).filter((id) => validOptionIds.has(id));

    return {
      spec_def_id: def.spec_def_id,
      code: def.code,
      display_name: def.display_name,
      value_type: "enum",
      spec_option_ids: savedIds,
      value_boolean: null,
      value_number: null,
      value_number_max: null,
      unit_symbol: def.unit_symbol,
      to_canonical_factor: def.to_canonical_factor,
      decimal_places: def.decimal_places,
    };
  }

  if (def.value_type === "boolean") {
    return {
      spec_def_id: def.spec_def_id,
      code: def.code,
      display_name: def.display_name,
      value_type: "boolean",
      spec_option_ids: [],
      value_boolean: saved?.value_boolean ?? null,
      value_number: null,
      value_number_max: null,
      unit_symbol: def.unit_symbol,
      to_canonical_factor: def.to_canonical_factor,
      decimal_places: def.decimal_places,
    };
  }

  return {
    spec_def_id: def.spec_def_id,
    code: def.code,
    display_name: def.display_name,
    value_type: def.value_type,
    spec_option_ids: [],
    value_boolean: null,
    value_number: specValueToDisplay(saved?.value_number, unitMeta),
    value_number_max: specValueToDisplay(saved?.value_number_max, unitMeta),
    unit_symbol: def.unit_symbol,
    to_canonical_factor: def.to_canonical_factor,
    decimal_places: def.decimal_places,
  };
};

/**
 * Sync form rows to contextual defs from item links.
 * Stale defs (removed from union when links shrink) are dropped; preserved values
 * remain only for defs still in the union.
 */
export const mergePartSpecsWithDefs = (
  existing: PartSpecFormRow[],
  defs: PartSpecDefPickerRow[],
): PartSpecFormRow[] => {
  const collapsed = collapsePartSpecRows(existing);
  const savedByDef = new Map(collapsed.map((row) => [row.spec_def_id, row]));

  return defs.map((def) => defaultRowForDef(def, savedByDef.get(def.spec_def_id)));
};

export const partSpecRowsEqual = (
  left: PartSpecFormRow[],
  right: PartSpecFormRow[],
): boolean => JSON.stringify(left) === JSON.stringify(right);

export class PartSpecValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartSpecValidationError";
  }
}

/** Expand one row per def into flat PATCH rows (J7: one row per enum option). */
export const expandPartSpecsForPatch = (
  rows: PartSpecFormRow[],
): PartSpecPatchBodyRow[] => {
  const patchRows: PartSpecPatchBodyRow[] = [];

  for (const row of rows) {
    const valueType = row.value_type ?? "boolean";
    const unitMeta = unitMetaFromRow(row);

    if (valueType === "enum") {
      for (const optionId of row.spec_option_ids ?? []) {
        patchRows.push({
          spec_def_id: row.spec_def_id,
          spec_option_id: optionId,
          value_boolean: null,
          value_number: null,
          value_number_max: null,
        });
      }
      continue;
    }

    if (valueType === "boolean" && row.value_boolean !== null && row.value_boolean !== undefined) {
      patchRows.push({
        spec_def_id: row.spec_def_id,
        spec_option_id: null,
        value_boolean: row.value_boolean,
        value_number: null,
        value_number_max: null,
      });
      continue;
    }

    if (
      valueType === "number" &&
      row.value_number !== null &&
      row.value_number !== undefined
    ) {
      const hasMax =
        row.value_number_max !== null && row.value_number_max !== undefined;
      const maxValue = row.value_number_max;
      if (hasMax && maxValue !== null && maxValue !== undefined && row.value_number > maxValue) {
        throw new PartSpecValidationError(
          `Value min must be less than or equal to max for ${row.display_name ?? row.spec_def_id}`,
        );
      }

      patchRows.push({
        spec_def_id: row.spec_def_id,
        spec_option_id: null,
        value_boolean: null,
        value_number: specValueToCanonical(row.value_number, unitMeta),
        value_number_max: hasMax && maxValue !== null && maxValue !== undefined
          ? specValueToCanonical(maxValue, unitMeta)
          : null,
      });
    }
  }

  return patchRows;
};

/** Convert canonical server rows to display units for form hydration. */
export const partSpecsToDisplayUnits = (
  rows: PartSpecFormRow[],
): PartSpecFormRow[] =>
  rows.map((row) => {
    const unitMeta = unitMetaFromRow(row);
    if (row.value_type !== "number") {
      return row;
    }

    return {
      ...row,
      value_number: specValueToDisplay(row.value_number, unitMeta),
      value_number_max: specValueToDisplay(row.value_number_max, unitMeta),
    };
  });
