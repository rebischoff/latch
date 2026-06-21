// DO NOT EDIT — generated from vendor_list.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { VendorListRow } from "./vendor_list.glue.generated";
import { vendorListColumnMap } from "./vendor_list.schema.generated";

/** Parameterized single-table store SQL for `party`. */
export const createVendorListStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<VendorListRow>({
    pool,
    table: "party",
    columns: columnBindingsFromMap(vendorListColumnMap),
    getActorId,
    mapRow: (row) => row as VendorListRow,
  });
