// DO NOT EDIT — generated from user_detail.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { UserDetailRow } from "./user_detail.glue.generated.js";
import { userDetailColumnMap } from "./user_detail.schema.generated.js";

/** Parameterized single-table store SQL for `latch_users`. */
export const createUserDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<UserDetailRow>({
    pool,
    table: "latch_users",
    columns: columnBindingsFromMap(userDetailColumnMap),
    getActorId,
    mapRow: (row) => row as UserDetailRow,
  });
