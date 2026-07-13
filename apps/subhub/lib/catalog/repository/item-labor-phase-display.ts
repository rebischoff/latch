import type { ItemLaborPhaseRow } from "./item-detail";
import type { LaborPhaseOrigin } from "../labor-phase-resolve";

/** Per-row origin from whether an own row exists for this `labor_phase_id`. */
export const laborPhaseRowOrigin = (
  laborPhaseId: string,
  ownRows: Array<Pick<ItemLaborPhaseRow, "labor_phase_id">>,
): LaborPhaseOrigin =>
  ownRows.some((row) => row.labor_phase_id === laborPhaseId) ? "own" : "inherited";
