// DO NOT EDIT — generated from category_detail.surface.yaml

import type { Pool } from "pg";

import {
  columnBindingsFromMap,
  createPgStoreAdapter,
} from "@latch/adapter-pg-store";

import type { CategoryDetailRow } from "./category_detail.glue.generated";
import { categoryDetailColumnMap } from "./category_detail.schema.generated";

/** Parameterized single-table store SQL for `category`. */
export const createCategoryDetailStore = (
  pool: Pool,
  getActorId: () => Promise<string>,
) =>
  createPgStoreAdapter<CategoryDetailRow>({
    pool,
    table: "category",
    columns: columnBindingsFromMap(categoryDetailColumnMap),
    getActorId,
    mapRow: (row) => row as CategoryDetailRow,
  });
