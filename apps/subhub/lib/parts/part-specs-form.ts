import type { PartSpecDefPickerRow } from "@/lib/surface-api";

export type PartSpecFormRow = {
  code?: string;
  display_name?: string;
  spec_def_id: string;
  spec_option_ids?: string[];
  value_boolean?: boolean | null;
  value_text?: string | null;
  value_type?: "boolean" | "enum" | "text";
};

export type PartSpecPatchBodyRow = {
  spec_def_id: string;
  spec_option_id: string | null;
  value_boolean: boolean | null;
  value_text: string | null;
};

/** Collapse flat API rows (one per enum option) into one row per spec_def. */
export const collapsePartSpecRows = (rows: PartSpecFormRow[]): PartSpecFormRow[] => {
  const byDef = new Map<string, PartSpecFormRow>();

  for (const row of rows) {
    if (!row.spec_def_id) {
      continue;
    }

    const valueType = row.value_type ?? "text";

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
        value_text: null,
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
      value_text: row.value_text ?? null,
    });
  }

  return [...byDef.values()];
};

const defaultRowForDef = (
  def: PartSpecDefPickerRow,
  saved: PartSpecFormRow | undefined,
): PartSpecFormRow => {
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
      value_text: null,
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
      value_text: null,
    };
  }

  return {
    spec_def_id: def.spec_def_id,
    code: def.code,
    display_name: def.display_name,
    value_type: "text",
    spec_option_ids: [],
    value_boolean: null,
    value_text: saved?.value_text ?? null,
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

/** Expand one row per def into flat PATCH rows (J7: one row per enum option). */
export const expandPartSpecsForPatch = (
  rows: PartSpecFormRow[],
): PartSpecPatchBodyRow[] => {
  const patchRows: PartSpecPatchBodyRow[] = [];

  for (const row of rows) {
    const valueType = row.value_type ?? "text";

    if (valueType === "enum") {
      for (const optionId of row.spec_option_ids ?? []) {
        patchRows.push({
          spec_def_id: row.spec_def_id,
          spec_option_id: optionId,
          value_text: null,
          value_boolean: null,
        });
      }
      continue;
    }

    if (valueType === "boolean" && row.value_boolean !== null && row.value_boolean !== undefined) {
      patchRows.push({
        spec_def_id: row.spec_def_id,
        spec_option_id: null,
        value_text: null,
        value_boolean: row.value_boolean,
      });
      continue;
    }

    const text = row.value_text?.trim() ?? "";
    if (valueType === "text" && text) {
      patchRows.push({
        spec_def_id: row.spec_def_id,
        spec_option_id: null,
        value_text: text,
        value_boolean: null,
      });
    }
  }

  return patchRows;
};
