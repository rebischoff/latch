// DO NOT EDIT — generated from requested_order_detail.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { RequestedOrderDetailRow } from "./requested_order_detail.glue.generated";
import { requestedOrderDetailColumnMap } from "./requested_order_detail.schema.generated";

/** Parameterized single-table store SQL for `requested_order`. */
export const createRequestedOrderDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<RequestedOrderDetailRow>({
    pool,
    table: "requested_order",
    columns: columnBindingsFromMap(requestedOrderDetailColumnMap),
    getActorId,
    mapRow: (row) => row as RequestedOrderDetailRow,
  });
