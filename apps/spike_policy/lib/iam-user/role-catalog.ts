import type { Pool, PoolClient } from "pg";

import type { RoleClass } from "../iam/memory-role-store.js";
import type { RoleCatalogEntry } from "./validate-assignments.js";

/** `Map<roleId, RoleCatalogEntry>` from `latch_roles` for P4a / P4b validation. */
export const loadRoleCatalogFromPg = async (
  client: Pool | PoolClient,
): Promise<Map<string, RoleCatalogEntry>> => {
  const result = await client.query<{ id: string; role_class: RoleClass }>(
    "SELECT id, role_class FROM latch_roles",
  );
  const catalog = new Map<string, RoleCatalogEntry>();
  for (const row of result.rows) {
    catalog.set(row.id, { id: row.id, roleClass: row.role_class });
  }
  return catalog;
};
