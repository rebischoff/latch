// DO NOT EDIT — generated from widget_detail.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { WidgetDetailRow } from "./widget_detail.glue.generated.js";
import { widgetDetailColumnMap } from "./widget_detail.schema.generated.js";

/** Parameterized single-table store SQL for `widgets`. */
export const createWidgetDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<WidgetDetailRow>({
    pool,
    table: "widgets",
    columns: columnBindingsFromMap(widgetDetailColumnMap),
    getActorId,
    scopeColumn: "scope_id",
    statusColumn: "status",
    mapRow: (row) => row as WidgetDetailRow,
  });
