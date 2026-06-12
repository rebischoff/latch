import type { ListQuery, ListResult, StoreAdapter } from "@latch/dal";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool } from "pg";

/** Maps a row property to a physical SQL column on the anchor table. */
export type PgColumnBinding = {
  property: string;
  column: string;
};

export type PgColumnMap = Record<string, readonly string[]>;

export type CreatePgStoreAdapterOptions<TRow extends { id: string }> = {
  pool: Pool;
  table: string;
  columns: readonly PgColumnBinding[];
  /** Session actor for writes (`withPermissionDb`). */
  getActorId: () => Promise<string>;
  /** SQL column for `rowScope: scope` list/visibility filtering. */
  scopeColumn?: string;
  /** SQL column for `rowScope: own` list/visibility filtering. */
  ownerColumn?: string;
  /** SQL column for optional list `status` filter. */
  statusColumn?: string;
  mapRow: (row: Record<string, unknown>) => TRow;
  /** Default related payload for single-table surfaces. */
  emptyRelated?: () => unknown;
};

const quoteIdent = (ident: string): string => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(ident)) {
    throw new Error(`Invalid SQL identifier: ${ident}`);
  }
  return ident;
};

/** Build column bindings from codegen `columnMap` (single-table surfaces only). */
export const columnBindingsFromMap = (
  columnMap: PgColumnMap,
): PgColumnBinding[] => {
  const bindings: PgColumnBinding[] = [];
  for (const columns of Object.values(columnMap)) {
    for (const qualified of columns) {
      const dot = qualified.lastIndexOf(".");
      const column = dot === -1 ? qualified : qualified.slice(dot + 1);
      if (!bindings.some((b) => b.column === column)) {
        bindings.push({ property: column, column });
      }
    }
  }
  return bindings.sort((a, b) => a.column.localeCompare(b.column));
};

export const createPgStoreAdapter = <
  TRow extends { id: string },
  TRelated = unknown,
>(
  options: CreatePgStoreAdapterOptions<TRow>,
): StoreAdapter<TRow, TRelated> => {
  const table = quoteIdent(options.table);
  const columnIdents = options.columns.map((c) => quoteIdent(c.column));
  const selectColumns = ["id", ...columnIdents].join(", ");

  const mapRowFromDb = (raw: Record<string, unknown>): TRow => {
    const mapped: Record<string, unknown> = { id: raw.id };
    for (const col of options.columns) {
      mapped[col.property] = raw[col.column];
    }
    return options.mapRow(mapped);
  };

  const buildListWhere = (query: ListQuery, params: unknown[]): string => {
    const clauses: string[] = [];

    if (query.rowScope === "own") {
      if (!options.ownerColumn) {
        return "FALSE";
      }
      params.push(query.principalId);
      clauses.push(`${quoteIdent(options.ownerColumn)} = $${params.length}`);
    } else if (query.rowScope === "scope") {
      if (!options.scopeColumn) {
        return "FALSE";
      }
      const scopeIds = query.scopeIds ?? [];
      if (scopeIds.length === 0) {
        return "FALSE";
      }
      params.push(scopeIds);
      clauses.push(
        `${quoteIdent(options.scopeColumn)} = ANY($${params.length})`,
      );
    }

    if (query.status !== undefined && options.statusColumn) {
      params.push(query.status);
      clauses.push(`${quoteIdent(options.statusColumn)} = $${params.length}`);
    }

    return clauses.length > 0 ? clauses.join(" AND ") : "TRUE";
  };

  const emptyRelated = (): TRelated =>
    (options.emptyRelated?.() ?? []) as TRelated;

  return {
    get: async (id: string): Promise<TRow | undefined> => {
      const result = await options.pool.query<Record<string, unknown>>(
        `SELECT ${selectColumns} FROM ${table} WHERE id = $1`,
        [id],
      );
      const row = result.rows[0];
      return row ? mapRowFromDb(row) : undefined;
    },

    list: async (query: ListQuery): Promise<ListResult<TRow>> => {
      const params: unknown[] = [];
      const where = buildListWhere(query, params);
      const countResult = await options.pool.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM ${table} WHERE ${where}`,
        params,
      );
      const total = countResult.rows[0]?.total ?? 0;

      const listParams = [...params, query.limit, query.offset];
      const limitIdx = listParams.length - 1;
      const offsetIdx = listParams.length;
      const listResult = await options.pool.query<Record<string, unknown>>(
        `SELECT ${selectColumns} FROM ${table} WHERE ${where} ORDER BY id LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        listParams,
      );

      return {
        rows: listResult.rows.map(mapRowFromDb),
        total,
      };
    },

    upsert: async (row: TRow): Promise<void> => {
      const actorId = await options.getActorId();
      const insertCols = ["id", ...options.columns.map((c) => c.column)];
      const values = [
        row.id,
        ...options.columns.map(
          (c) => (row as Record<string, unknown>)[c.property],
        ),
      ];
      const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(", ");
      const updateSets = options.columns
        .map((c) => `${quoteIdent(c.column)} = EXCLUDED.${quoteIdent(c.column)}`)
        .join(", ");

      await withPermissionDb(options.pool, actorId, async (client) => {
        await client.query(
          `INSERT INTO ${table} (${insertCols.map(quoteIdent).join(", ")})
           VALUES (${placeholders})
           ON CONFLICT (id) DO UPDATE SET ${updateSets}`,
          values,
        );
      });
    },

    delete: async (id: string): Promise<void> => {
      const actorId = await options.getActorId();
      await withPermissionDb(options.pool, actorId, async (client) => {
        await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      });
    },

    getRelated: async (): Promise<TRelated> => emptyRelated(),

    replaceRelated: async (): Promise<void> => {},

    isRowVisibleToPrincipal: async (
      entityId: string,
      principalId: string,
      rowScope: ListQuery["rowScope"] | undefined,
      scopeIds?: ListQuery["scopeIds"],
    ): Promise<boolean> => {
      const result = await options.pool.query<Record<string, unknown>>(
        `SELECT ${selectColumns} FROM ${table} WHERE id = $1`,
        [entityId],
      );
      const raw = result.rows[0];
      if (!raw) {
        return false;
      }

      if (rowScope === "own") {
        if (!options.ownerColumn) {
          return false;
        }
        return raw[options.ownerColumn] === principalId;
      }

      if (rowScope === "scope") {
        if (!options.scopeColumn || !scopeIds?.length) {
          return false;
        }
        return scopeIds.includes(String(raw[options.scopeColumn]));
      }

      return true;
    },
  };
};
