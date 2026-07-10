import { ValidationError } from "@latch/contracts";
import type { Pool, PoolClient } from "pg";

import {
  countCatalogTableUsage,
  insertCatalogTableRow,
  loadCatalogTableList,
  replaceCatalogTable,
  type CatalogTableConfig,
} from "./catalog-tables";

const validateAddOnRow = (row: Record<string, unknown>): void => {
  const percent = Number(row.percent ?? 0);
  const amountCents = Number(row.amount_cents ?? 0);
  if (percent <= 0 && amountCents <= 0) {
    throw new ValidationError("percent or amount is required", {
      field: "percent",
      code: "required_one",
    });
  }
};

const itemFkBlockers =
  (columns: string[]) =>
  async (client: PoolClient, id: string) => {
    const blockers: Array<{ type: string; count: number }> = [];
    for (const column of columns) {
      const count = await countCatalogTableUsage(client, "item", column, id);
      if (count > 0) {
        blockers.push({ type: `item.${column}`, count });
      }
    }
    return blockers;
  };

export const laborRateTypeConfig: CatalogTableConfig = {
  anchorTable: "labor_rate_type",
  selectSql: "SELECT id, name, rate_cents, sort_order FROM labor_rate_type",
  columns: ["id", "name", "rate_cents", "sort_order"],
  insertValues: (row, id) => [
    id,
    row.name,
    Number(row.rate_cents ?? 0),
    Number(row.sort_order ?? 0),
  ],
  updateSet: "name = $2, rate_cents = $3, sort_order = $4",
  deleteBlockers: async (client, id) => {
    const count = await countCatalogTableUsage(
      client,
      "item_labor_phase",
      "labor_rate_type_id",
      id,
    );
    return count > 0 ? [{ type: "item_labor_phase", count }] : [];
  },
};

export const laborPhaseConfig: CatalogTableConfig = {
  anchorTable: "labor_phase",
  selectSql: "SELECT id, name, sort_order FROM labor_phase",
  columns: ["id", "name", "sort_order"],
  insertValues: (row, id) => [id, row.name, Number(row.sort_order ?? 0)],
  updateSet: "name = $2, sort_order = $3",
  deleteBlockers: async (client, id) => {
    const count = await countCatalogTableUsage(
      client,
      "item_labor_phase",
      "labor_phase_id",
      id,
    );
    return count > 0 ? [{ type: "item_labor_phase", count }] : [];
  },
};

export const complexityFactorConfig: CatalogTableConfig = {
  anchorTable: "complexity_factor",
  selectSql: "SELECT id, name, factor_percent, sort_order FROM complexity_factor",
  columns: ["id", "name", "factor_percent", "sort_order"],
  insertValues: (row, id) => [
    id,
    row.name,
    Number(row.factor_percent ?? 100),
    Number(row.sort_order ?? 0),
  ],
  updateSet: "name = $2, factor_percent = $3, sort_order = $4",
  deleteBlockers: async (client, id) => {
    const conditionCount = await countCatalogTableUsage(
      client,
      "estimate_condition",
      "complexity_factor_id",
      id,
    );
    const blockers: Array<{ type: string; count: number }> = [];
    if (conditionCount > 0) {
      blockers.push({ type: "estimate_condition", count: conditionCount });
    }
    return blockers;
  },
};

export const markupTypeConfig: CatalogTableConfig = {
  anchorTable: "markup_type",
  selectSql:
    "SELECT id, name, material_markup_percent, labor_markup_percent, sort_order FROM markup_type",
  columns: ["id", "name", "material_markup_percent", "labor_markup_percent", "sort_order"],
  insertValues: (row, id) => [
    id,
    row.name,
    Number(row.material_markup_percent ?? 0),
    Number(row.labor_markup_percent ?? 0),
    Number(row.sort_order ?? 0),
  ],
  updateSet:
    "name = $2, material_markup_percent = $3, labor_markup_percent = $4, sort_order = $5",
  deleteBlockers: itemFkBlockers(["markup_type_id"]),
};

const costAddOnConfig = (kind: "freight" | "incidental"): CatalogTableConfig => ({
  anchorTable: "cost_add_on_type",
  selectSql:
    "SELECT id, kind, name, percent, amount_cents, sort_order FROM cost_add_on_type",
  filterSql: `kind = '${kind}'`,
  nameUniqueScope: kind,
  columns: ["id", "kind", "name", "percent", "amount_cents", "sort_order"],
  insertValues: (row, id) => [
    id,
    kind,
    row.name,
    Number(row.percent ?? 0),
    Number(row.amount_cents ?? 0),
    Number(row.sort_order ?? 0),
  ],
  updateSet: "name = $2, percent = $3, amount_cents = $4, sort_order = $5",
  updateValues: (row) => [
    row.name,
    Number(row.percent ?? 0),
    Number(row.amount_cents ?? 0),
    Number(row.sort_order ?? 0),
  ],
  validateRow: validateAddOnRow,
  deleteBlockers: itemFkBlockers([
    kind === "freight" ? "freight_rate_type_id" : "incidental_rate_type_id",
  ]),
});

export const freightRateTypeConfig = costAddOnConfig("freight");
export const incidentalRateTypeConfig = costAddOnConfig("incidental");

export const loadLaborRateTypeList = (pool: Pool) =>
  loadCatalogTableList(pool, laborRateTypeConfig);

export const replaceLaborRateTypes = (
  pool: Pool,
  actorId: string,
  rows: Array<Record<string, unknown>>,
) => replaceCatalogTable(pool, actorId, laborRateTypeConfig, rows);

export const insertLaborRateType = (
  pool: Pool,
  actorId: string,
  row: Record<string, unknown>,
) => insertCatalogTableRow(pool, actorId, laborRateTypeConfig, row);

export const loadLaborPhaseList = (pool: Pool) =>
  loadCatalogTableList(pool, laborPhaseConfig);

export const replaceLaborPhases = (
  pool: Pool,
  actorId: string,
  rows: Array<Record<string, unknown>>,
) => replaceCatalogTable(pool, actorId, laborPhaseConfig, rows);

export const insertLaborPhase = (
  pool: Pool,
  actorId: string,
  row: Record<string, unknown>,
) => insertCatalogTableRow(pool, actorId, laborPhaseConfig, row);

export const loadComplexityFactorList = (pool: Pool) =>
  loadCatalogTableList(pool, complexityFactorConfig);

export const replaceComplexityFactors = (
  pool: Pool,
  actorId: string,
  rows: Array<Record<string, unknown>>,
) => replaceCatalogTable(pool, actorId, complexityFactorConfig, rows);

export const insertComplexityFactor = (
  pool: Pool,
  actorId: string,
  row: Record<string, unknown>,
) => insertCatalogTableRow(pool, actorId, complexityFactorConfig, row);

export const loadMarkupTypeList = (pool: Pool) =>
  loadCatalogTableList(pool, markupTypeConfig);

export const replaceMarkupTypes = (
  pool: Pool,
  actorId: string,
  rows: Array<Record<string, unknown>>,
) => replaceCatalogTable(pool, actorId, markupTypeConfig, rows);

export const insertMarkupType = (
  pool: Pool,
  actorId: string,
  row: Record<string, unknown>,
) => insertCatalogTableRow(pool, actorId, markupTypeConfig, row);

export const loadFreightRateTypeList = (pool: Pool) =>
  loadCatalogTableList(pool, freightRateTypeConfig);

export const replaceFreightRateTypes = (
  pool: Pool,
  actorId: string,
  rows: Array<Record<string, unknown>>,
) => replaceCatalogTable(pool, actorId, freightRateTypeConfig, rows);

export const insertFreightRateType = (
  pool: Pool,
  actorId: string,
  row: Record<string, unknown>,
) => insertCatalogTableRow(pool, actorId, freightRateTypeConfig, row);

export const loadIncidentalRateTypeList = (pool: Pool) =>
  loadCatalogTableList(pool, incidentalRateTypeConfig);

export const replaceIncidentalRateTypes = (
  pool: Pool,
  actorId: string,
  rows: Array<Record<string, unknown>>,
) => replaceCatalogTable(pool, actorId, incidentalRateTypeConfig, rows);

export const insertIncidentalRateType = (
  pool: Pool,
  actorId: string,
  row: Record<string, unknown>,
) => insertCatalogTableRow(pool, actorId, incidentalRateTypeConfig, row);
