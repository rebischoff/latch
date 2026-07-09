import type { ItemLaborPhaseRow } from "./item-detail";

export type LaborPhaseMode = "empty" | "inherited" | "override";

export const deriveLaborPhaseMode = (
  ownRows: Array<Pick<ItemLaborPhaseRow, "labor_phase_id">>,
  inheritedRows: Array<Pick<ItemLaborPhaseRow, "labor_phase_id">>,
): LaborPhaseMode => {
  if (ownRows.length > 0) {
    return "override";
  }
  if (inheritedRows.length > 0) {
    return "inherited";
  }
  return "empty";
};
