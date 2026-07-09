import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { InUseError } from "../../errors";
import { isUniqueViolation } from "../../sites/repository/sql-utils";

export type CatalogTableConfig = {
  anchorTable: string;
  columns: string[];
  deleteBlockers?: (
    client: PoolClient,
    id: string,
  ) => Promise<Array<{ type: string; count: number }>>;
  filterSql?: string;
  insertValues: (row: Record<string, unknown>, id: string) => unknown[];
  updateValues?: (row: Record<string, unknown>, id: string) => unknown[];
  nameColumn?: string;
  nameUniqueScope?: string;
  orderBy?: string;
  selectSql: string;
  updateSet: string;
  validateRow?: (row: Record<string, unknown>) => void;
};

const defaultOrderBy = "sort_order ASC, name ASC, id ASC";

export const loadCatalogTableList = async (
  pool: Pool,
  config: CatalogTableConfig,
): Promise<Record<string, unknown>[]> => {
  const where = config.filterSql ? `WHERE ${config.filterSql}` : "";
  const result = await pool.query<Record<string, unknown>>(
    `${config.selectSql} ${where} ORDER BY ${config.orderBy ?? defaultOrderBy}`,
  );
  return result.rows;
};

const assertUniqueName = async (
  client: PoolClient,
  config: CatalogTableConfig,
  name: string,
  excludeId?: string,
): Promise<void> => {
  const nameCol = config.nameColumn ?? "name";
  const params: unknown[] = [name];
  let sql = `SELECT id FROM ${config.anchorTable} WHERE ${nameCol} = $1`;

  if (config.nameUniqueScope) {
    params.push(config.nameUniqueScope);
    sql += ` AND kind = $${params.length}`;
  }

  if (excludeId !== undefined) {
    params.push(excludeId);
    sql += ` AND id <> $${params.length}`;
  }

  const result = await client.query<{ id: string }>(sql, params);
  if (result.rows.length > 0) {
    throw new ValidationError(`${nameCol} already exists`, {
      field: nameCol,
      code: "duplicate",
    });
  }
};

const assertNoDuplicateNames = (
  rows: Array<Record<string, unknown>>,
  nameColumn = "name",
): void => {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = String(row[nameColumn] ?? "")
      .trim()
      .toLowerCase();
    if (seen.has(key)) {
      throw new ValidationError(`${nameColumn} already exists`, {
        field: nameColumn,
        code: "duplicate",
      });
    }
    seen.add(key);
  }
};

const replaceCatalogTableTx = async (
  client: PoolClient,
  config: CatalogTableConfig,
  rows: Array<Record<string, unknown>>,
): Promise<Record<string, unknown>[]> => {
  assertNoDuplicateNames(rows, config.nameColumn ?? "name");

  const keepIds = rows
    .map((row) => row.id as string | undefined)
    .filter((id): id is string => id !== undefined);

  const existing = await client.query<{ id: string }>(
    `SELECT id FROM ${config.anchorTable}${config.filterSql ? ` WHERE ${config.filterSql}` : ""}`,
  );
  const deleteIds = existing.rows
    .map((row) => row.id)
    .filter((id) => !keepIds.includes(id));

  for (const id of deleteIds) {
    const blockers = config.deleteBlockers
      ? await config.deleteBlockers(client, id)
      : [];
    if (blockers.length > 0) {
      throw new InUseError(config.anchorTable, blockers);
    }
  }

  if (deleteIds.length > 0) {
    await client.query(
      `DELETE FROM ${config.anchorTable} WHERE id = ANY($1::text[])`,
      [deleteIds],
    );
  }

  const saved: Record<string, unknown>[] = [];

  for (const [index, row] of rows.entries()) {
    config.validateRow?.(row);
    const id = (row.id as string | undefined) ?? crypto.randomUUID();
    const sortOrder = index + 1;
    const payload = { ...row, id, sort_order: sortOrder };

    await assertUniqueName(
      client,
      config,
      String(row[config.nameColumn ?? "name"]),
      row.id as string | undefined,
    );

    try {
      if (row.id) {
        const updateParams = config.updateValues?.(payload, id) ??
          config.insertValues(payload, id).slice(1);
        await client.query(
          `UPDATE ${config.anchorTable} SET ${config.updateSet} WHERE id = $1`,
          [id, ...updateParams],
        );
      } else {
        await client.query(
          `INSERT INTO ${config.anchorTable} (${config.columns.join(", ")})
           VALUES (${config.columns.map((_, i) => `$${i + 1}`).join(", ")})`,
          config.insertValues(payload, id),
        );
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ValidationError(`${config.nameColumn ?? "name"} already exists`, {
          field: config.nameColumn ?? "name",
          code: "duplicate",
        });
      }
      throw error;
    }

    saved.push({ ...payload, sort_order: sortOrder });
  }

  return saved;
};

export const replaceCatalogTable = async (
  pool: Pool,
  actorId: string,
  config: CatalogTableConfig,
  rows: Array<Record<string, unknown>>,
): Promise<Record<string, unknown>[]> => {
  let saved: Record<string, unknown>[] = [];
  await withPermissionDb(pool, actorId, async (client) => {
    saved = await replaceCatalogTableTx(client, config, rows);
  });
  return saved;
};

export const insertCatalogTableRow = async (
  pool: Pool,
  actorId: string,
  config: CatalogTableConfig,
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const id = crypto.randomUUID();
  config.validateRow?.(row);

  await withPermissionDb(pool, actorId, async (client) => {
    await assertUniqueName(
      client,
      config,
      String(row[config.nameColumn ?? "name"]),
    );
    try {
      await client.query(
        `INSERT INTO ${config.anchorTable} (${config.columns.join(", ")})
         VALUES (${config.columns.map((_, i) => `$${i + 1}`).join(", ")})`,
        config.insertValues({ ...row, sort_order: row.sort_order ?? 0 }, id),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ValidationError(`${config.nameColumn ?? "name"} already exists`, {
          field: config.nameColumn ?? "name",
          code: "duplicate",
        });
      }
      throw error;
    }
  });

  return { id, ...row };
};

export const countCatalogTableUsage = async (
  client: PoolClient,
  table: string,
  column: string,
  id: string,
): Promise<number> => {
  const result = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM ${table} WHERE ${column} = $1`,
    [id],
  );
  return result.rows[0]?.count ?? 0;
};
