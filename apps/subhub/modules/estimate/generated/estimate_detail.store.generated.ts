// DO NOT EDIT — generated from estimate_detail.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { EstimateDetailRow } from "./estimate_detail.glue.generated";
import { estimateDetailColumnMap } from "./estimate_detail.schema.generated";

/** Parameterized single-table store SQL for `estimate`. */
export const createEstimateDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<EstimateDetailRow>({
    pool,
    table: "estimate",
    columns: columnBindingsFromMap(estimateDetailColumnMap),
    getActorId,
    mapRow: (row) => row as EstimateDetailRow,
  });
