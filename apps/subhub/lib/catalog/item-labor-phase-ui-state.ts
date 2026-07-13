import type { LaborPhaseOrigin } from "./labor-phase-resolve";

export type ItemLaborPhaseOwnRow = {
  hours_per_unit: number;
  labor_phase_id: string;
  labor_phase_name?: string;
  labor_rate_type_id: string;
  labor_rate_type_name?: string;
  sort_order?: number;
};

export type ItemLaborPhaseResolvedRow = {
  hours_per_unit: number;
  labor_phase_id: string;
  labor_phase_name?: string;
  labor_rate_type_id: string;
  labor_rate_type_name?: string;
  origin: LaborPhaseOrigin;
  sort_order?: number;
  source_item_id: string | null;
  source_item_name: string | null;
};

export type ItemLaborPhaseDisplayRow =
  | {
      kind: "own";
      ownIndex: number;
      labor_phase_id: string;
      labor_phase_name: string;
      labor_rate_type_id: string;
      labor_rate_type_name: string;
      hours_per_unit: number;
      sort_order: number;
    }
  | {
      kind: "inherited";
      labor_phase_id: string;
      labor_phase_name: string;
      labor_rate_type_id: string;
      labor_rate_type_name: string;
      hours_per_unit: number;
      sort_order: number;
      source_item_id: string | null;
      source_item_name: string | null;
    };

/**
 * Build the catalog labor-phase table rows for the current form state:
 * own form rows (editable) + resolved inherited rows whose phase is not overridden.
 */
export const buildItemLaborPhaseDisplayRows = (input: {
  ownRows: ItemLaborPhaseOwnRow[];
  resolvedRows: ItemLaborPhaseResolvedRow[];
}): ItemLaborPhaseDisplayRow[] => {
  const ownIds = new Set(
    input.ownRows
      .map((row) => row.labor_phase_id)
      .filter((id): id is string => Boolean(id)),
  );

  const ownDisplay: ItemLaborPhaseDisplayRow[] = input.ownRows.map((row, ownIndex) => ({
    kind: "own",
    ownIndex,
    labor_phase_id: row.labor_phase_id,
    labor_phase_name: row.labor_phase_name ?? "",
    labor_rate_type_id: row.labor_rate_type_id,
    labor_rate_type_name: row.labor_rate_type_name ?? "",
    hours_per_unit: row.hours_per_unit,
    sort_order: row.sort_order ?? ownIndex + 1,
  }));

  const inheritedDisplay: ItemLaborPhaseDisplayRow[] = input.resolvedRows
    .filter((row) => row.origin === "inherited" && !ownIds.has(row.labor_phase_id))
    .map((row) => ({
      kind: "inherited" as const,
      labor_phase_id: row.labor_phase_id,
      labor_phase_name: row.labor_phase_name ?? "",
      labor_rate_type_id: row.labor_rate_type_id,
      labor_rate_type_name: row.labor_rate_type_name ?? "",
      hours_per_unit: row.hours_per_unit,
      sort_order: row.sort_order ?? 0,
      source_item_id: row.source_item_id,
      source_item_name: row.source_item_name,
    }));

  return [...ownDisplay, ...inheritedDisplay];
};
