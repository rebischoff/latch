// DO NOT EDIT — generated from site_list.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { SiteListRow } from "./site_list.glue.generated";
import { siteListColumnMap } from "./site_list.schema.generated";

/** Parameterized single-table store SQL for `site`. */
export const createSiteListStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<SiteListRow>({
    pool,
    table: "site",
    columns: columnBindingsFromMap(siteListColumnMap),
    getActorId,
    mapRow: (row) => row as SiteListRow,
  });
