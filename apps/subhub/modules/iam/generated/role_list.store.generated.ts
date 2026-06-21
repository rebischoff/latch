// DO NOT EDIT — generated from role_list.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { RoleListRow } from "./role_list.glue.generated";
import { roleListColumnMap } from "./role_list.schema.generated";

/** Parameterized single-table store SQL for `latch_roles`. */
export const createRoleListStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<RoleListRow>({
    pool,
    table: "latch_roles",
    columns: columnBindingsFromMap(roleListColumnMap),
    getActorId,
    mapRow: (row) => row as RoleListRow,
  });
