// DO NOT EDIT — generated from markup_type_table.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { MarkupTypeTableRow } from "./markup_type_table.glue.generated";
import { markupTypeTableColumnMap } from "./markup_type_table.schema.generated";

/** Parameterized single-table store SQL for `markup_type`. */
export const createMarkupTypeTableStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<MarkupTypeTableRow>({
    pool,
    table: "markup_type",
    columns: columnBindingsFromMap(markupTypeTableColumnMap),
    getActorId,
    mapRow: (row) => row as MarkupTypeTableRow,
  });
