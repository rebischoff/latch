// DO NOT EDIT — generated from freight_rate_type_table.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { FreightRateTypeTableRow } from "./freight_rate_type_table.glue.generated";
import { freightRateTypeTableColumnMap } from "./freight_rate_type_table.schema.generated";

/** Parameterized single-table store SQL for `cost_add_on_type`. */
export const createFreightRateTypeTableStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<FreightRateTypeTableRow>({
    pool,
    table: "cost_add_on_type",
    columns: columnBindingsFromMap(freightRateTypeTableColumnMap),
    getActorId,
    mapRow: (row) => row as FreightRateTypeTableRow,
  });
