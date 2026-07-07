// DO NOT EDIT — generated from labor_phase_table.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { LaborPhaseTableRow } from "./labor_phase_table.glue.generated";
import { laborPhaseTableColumnMap } from "./labor_phase_table.schema.generated";

/** Parameterized single-table store SQL for `labor_phase`. */
export const createLaborPhaseTableStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<LaborPhaseTableRow>({
    pool,
    table: "labor_phase",
    columns: columnBindingsFromMap(laborPhaseTableColumnMap),
    getActorId,
    mapRow: (row) => row as LaborPhaseTableRow,
  });
