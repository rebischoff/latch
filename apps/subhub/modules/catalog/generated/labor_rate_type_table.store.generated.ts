// DO NOT EDIT — generated from labor_rate_type_table.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { LaborRateTypeTableRow } from "./labor_rate_type_table.glue.generated";
import { laborRateTypeTableColumnMap } from "./labor_rate_type_table.schema.generated";

/** Parameterized single-table store SQL for `labor_rate_type`. */
export const createLaborRateTypeTableStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<LaborRateTypeTableRow>({
    pool,
    table: "labor_rate_type",
    columns: columnBindingsFromMap(laborRateTypeTableColumnMap),
    getActorId,
    mapRow: (row) => row as LaborRateTypeTableRow,
  });
