// DO NOT EDIT — generated from spec_unit_table.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { SpecUnitTableRow } from "./spec_unit_table.glue.generated";
import { specUnitTableColumnMap } from "./spec_unit_table.schema.generated";

/** Parameterized single-table store SQL for `spec_unit`. */
export const createSpecUnitTableStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<SpecUnitTableRow>({
    pool,
    table: "spec_unit",
    columns: columnBindingsFromMap(specUnitTableColumnMap),
    getActorId,
    mapRow: (row) => row as SpecUnitTableRow,
  });
