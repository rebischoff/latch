// DO NOT EDIT — generated from job_detail.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { JobDetailRow } from "./job_detail.glue.generated";
import { jobDetailColumnMap } from "./job_detail.schema.generated";

/** Parameterized single-table store SQL for `job`. */
export const createJobDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<JobDetailRow>({
    pool,
    table: "job",
    columns: columnBindingsFromMap(jobDetailColumnMap),
    getActorId,
    mapRow: (row) => row as JobDetailRow,
  });
