// DO NOT EDIT — generated from part_detail.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { PartDetailRow } from "./part_detail.glue.generated";
import { partDetailColumnMap } from "./part_detail.schema.generated";

/** Parameterized single-table store SQL for `manufacturer_part`. */
export const createPartDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<PartDetailRow>({
    pool,
    table: "manufacturer_part",
    columns: columnBindingsFromMap(partDetailColumnMap),
    getActorId,
    mapRow: (row) => row as PartDetailRow,
  });
