// DO NOT EDIT — generated from site_detail.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { SiteDetailRow } from "./site_detail.glue.generated";
import { siteDetailColumnMap } from "./site_detail.schema.generated";

/** Parameterized single-table store SQL for `site`. */
export const createSiteDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<SiteDetailRow>({
    pool,
    table: "site",
    columns: columnBindingsFromMap(siteDetailColumnMap),
    getActorId,
    mapRow: (row) => row as SiteDetailRow,
  });
