// DO NOT EDIT — generated from contact_detail.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { ContactDetailRow } from "./contact_detail.glue.generated.js";
import { contactDetailColumnMap } from "./contact_detail.schema.generated.js";

/** Parameterized single-table store SQL for `party`. */
export const createContactDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<ContactDetailRow>({
    pool,
    table: "party",
    columns: columnBindingsFromMap(contactDetailColumnMap),
    getActorId,
    mapRow: (row) => row as ContactDetailRow,
  });
