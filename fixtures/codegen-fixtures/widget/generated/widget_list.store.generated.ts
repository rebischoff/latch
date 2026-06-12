// DO NOT EDIT — generated from widget_list.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { WidgetListRow } from "./widget_list.glue.generated.js";
import { widgetListColumnMap } from "./widget_list.schema.generated.js";

/** Parameterized single-table store SQL for `widgets`. */
export const createWidgetListStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<WidgetListRow>({
    pool,
    table: "widgets",
    columns: columnBindingsFromMap(widgetListColumnMap),
    getActorId,
    statusColumn: "status",
    mapRow: (row) => row as WidgetListRow,
  });
