// DO NOT EDIT — generated from site_contact_relation_table.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { SiteContactRelationTableRow } from "./site_contact_relation_table.glue.generated";
import { siteContactRelationTableColumnMap } from "./site_contact_relation_table.schema.generated";

/** Parameterized single-table store SQL for `site_contact_relation`. */
export const createSiteContactRelationTableStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<SiteContactRelationTableRow>({
    pool,
    table: "site_contact_relation",
    columns: columnBindingsFromMap(siteContactRelationTableColumnMap),
    getActorId,
    mapRow: (row) => row as SiteContactRelationTableRow,
  });
