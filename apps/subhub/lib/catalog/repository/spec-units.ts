import type { Pool } from "pg";

import {
  countCatalogTableUsage,
  insertCatalogTableRow,
  loadCatalogTableList,
  replaceCatalogTable,
  type CatalogTableConfig,
} from "./catalog-tables";

export const specUnitConfig: CatalogTableConfig = {
  anchorTable: "spec_unit",
  selectSql:
    "SELECT id, symbol, name, dimension, canonical_unit_id, to_canonical_factor, sort_order FROM spec_unit",
  columns: [
    "id",
    "symbol",
    "name",
    "dimension",
    "canonical_unit_id",
    "to_canonical_factor",
    "sort_order",
  ],
  nameColumn: "symbol",
  insertValues: (row, id) => [
    id,
    row.symbol,
    row.name,
    row.dimension,
    row.canonical_unit_id ?? null,
    Number(row.to_canonical_factor ?? 1),
    Number(row.sort_order ?? 0),
  ],
  updateSet:
    "symbol = $2, name = $3, dimension = $4, canonical_unit_id = $5, to_canonical_factor = $6, sort_order = $7",
  deleteBlockers: async (client, id) => {
    const count = await countCatalogTableUsage(client, "spec_def", "unit_id", id);
    return count > 0 ? [{ type: "spec_def.unit_id", count }] : [];
  },
};

export const loadSpecUnitList = (pool: Pool) => loadCatalogTableList(pool, specUnitConfig);

export const replaceSpecUnits = (
  pool: Pool,
  actorId: string,
  rows: Array<Record<string, unknown>>,
) => replaceCatalogTable(pool, actorId, specUnitConfig, rows);

export const insertSpecUnit = (
  pool: Pool,
  actorId: string,
  row: Record<string, unknown>,
) => insertCatalogTableRow(pool, actorId, specUnitConfig, row);
