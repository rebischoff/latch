// DO NOT EDIT — generated from job_party_relation_table.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { JobPartyRelationTableRow } from "./job_party_relation_table.glue.generated";
import { jobPartyRelationTableColumnMap } from "./job_party_relation_table.schema.generated";

/** Parameterized single-table store SQL for `job_party_relation`. */
export const createJobPartyRelationTableStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<JobPartyRelationTableRow>({
    pool,
    table: "job_party_relation",
    columns: columnBindingsFromMap(jobPartyRelationTableColumnMap),
    getActorId,
    mapRow: (row) => row as JobPartyRelationTableRow,
  });
