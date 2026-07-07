// DO NOT EDIT — generated from incidental_rate_type_table.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { IncidentalRateTypeTableRow } from "./incidental_rate_type_table.glue.generated";
import { incidentalRateTypeTableColumnMap } from "./incidental_rate_type_table.schema.generated";

/** Parameterized single-table store SQL for `cost_add_on_type`. */
export const createIncidentalRateTypeTableStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<IncidentalRateTypeTableRow>({
    pool,
    table: "cost_add_on_type",
    columns: columnBindingsFromMap(incidentalRateTypeTableColumnMap),
    getActorId,
    mapRow: (row) => row as IncidentalRateTypeTableRow,
  });
