import type { Pool } from "pg";

import {
  loadCatalogSystemSpecDefs,
  type CatalogSystemSpecDefRow,
} from "./catalog-system-specs";

export type CatalogSystemRow = {
  id: string;
  name: string;
  spec_defs: CatalogSystemSpecDefRow[];
};

export const loadCatalogSystems = async (
  pool: Pool,
): Promise<CatalogSystemRow[]> => {
  const [systemsResult, specDefs] = await Promise.all([
    pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM system ORDER BY name ASC, id ASC`,
    ),
    loadCatalogSystemSpecDefs(pool),
  ]);

  const specDefsBySystemId = new Map<string, CatalogSystemSpecDefRow[]>();
  for (const specDef of specDefs) {
    const defs = specDefsBySystemId.get(specDef.system_id) ?? [];
    defs.push(specDef);
    specDefsBySystemId.set(specDef.system_id, defs);
  }

  return systemsResult.rows.map((row) => ({
    id: row.id,
    name: row.name,
    spec_defs: specDefsBySystemId.get(row.id) ?? [],
  }));
};
