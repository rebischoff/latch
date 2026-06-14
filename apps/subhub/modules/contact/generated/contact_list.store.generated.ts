// DO NOT EDIT — generated from contact_list.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { ContactListRow } from "./contact_list.glue.generated.js";
import { contactListColumnMap } from "./contact_list.schema.generated.js";

/** Parameterized single-table store SQL for `party`. */
export const createContactListStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<ContactListRow>({
    pool,
    table: "party",
    columns: columnBindingsFromMap(contactListColumnMap),
    getActorId,
    mapRow: (row) => row as ContactListRow,
  });
