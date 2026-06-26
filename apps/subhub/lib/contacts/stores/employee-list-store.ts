import type { ListQuery, ListResult, StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";

import type { EmployeeListRow } from "../descriptors/employee-list";
import { loadEmployeeList } from "../repository/employee";

export const createEmployeeListStore = (
  pool: Pool,
): StoreAdapter<EmployeeListRow> => ({
  get: async () => undefined,

  list: async (query: ListQuery): Promise<ListResult<EmployeeListRow>> =>
    loadEmployeeList(pool, query),

  upsert: async () => {},

  delete: async () => {},

  getRelated: async () => ({}),

  replaceRelated: async () => {},

  isRowVisibleToPrincipal: async () => true,
});
