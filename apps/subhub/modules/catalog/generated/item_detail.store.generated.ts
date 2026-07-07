// DO NOT EDIT — generated from item_detail.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { ItemDetailRow } from "./item_detail.glue.generated";
import { itemDetailColumnMap } from "./item_detail.schema.generated";

/** Parameterized single-table store SQL for `item`. */
export const createItemDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<ItemDetailRow>({
    pool,
    table: "item",
    columns: columnBindingsFromMap(itemDetailColumnMap),
    getActorId,
    mapRow: (row) => row as ItemDetailRow,
  });
