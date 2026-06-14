// DO NOT EDIT — generated from customer_list.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { CustomerListRow } from "./customer_list.glue.generated.js";
import { customerListColumnMap } from "./customer_list.schema.generated.js";

/** Parameterized single-table store SQL for `party`. */
export const createCustomerListStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<CustomerListRow>({
    pool,
    table: "party",
    columns: columnBindingsFromMap(customerListColumnMap),
    getActorId,
    mapRow: (row) => row as CustomerListRow,
  });
