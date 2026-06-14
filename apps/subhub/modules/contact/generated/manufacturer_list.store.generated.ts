// DO NOT EDIT — generated from manufacturer_list.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { ManufacturerListRow } from "./manufacturer_list.glue.generated.js";
import { manufacturerListColumnMap } from "./manufacturer_list.schema.generated.js";

/** Parameterized single-table store SQL for `party`. */
export const createManufacturerListStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<ManufacturerListRow>({
    pool,
    table: "party",
    columns: columnBindingsFromMap(manufacturerListColumnMap),
    getActorId,
    mapRow: (row) => row as ManufacturerListRow,
  });
