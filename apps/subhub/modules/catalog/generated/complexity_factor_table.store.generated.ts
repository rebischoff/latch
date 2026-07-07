// DO NOT EDIT — generated from complexity_factor_table.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { ComplexityFactorTableRow } from "./complexity_factor_table.glue.generated";
import { complexityFactorTableColumnMap } from "./complexity_factor_table.schema.generated";

/** Parameterized single-table store SQL for `complexity_factor`. */
export const createComplexityFactorTableStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<ComplexityFactorTableRow>({
    pool,
    table: "complexity_factor",
    columns: columnBindingsFromMap(complexityFactorTableColumnMap),
    getActorId,
    mapRow: (row) => row as ComplexityFactorTableRow,
  });
