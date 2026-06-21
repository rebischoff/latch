// DO NOT EDIT — generated from user_list.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { UserListRow } from "./user_list.glue.generated";
import { userListColumnMap } from "./user_list.schema.generated";

/** Parameterized single-table store SQL for `latch_users`. */
export const createUserListStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<UserListRow>({
    pool,
    table: "latch_users",
    columns: columnBindingsFromMap(userListColumnMap),
    getActorId,
    mapRow: (row) => row as UserListRow,
  });
