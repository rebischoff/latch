import type { RowScope, ScopeId } from "@latch/contracts";

/** List query passed from the DAL kernel to the store. */
export type ListQuery = {
  principalId: string;
  rowScope: RowScope;
  /** From `manifest.scopeIds` when `rowScope === "scope"`. */
  scopeIds?: ScopeId[];
  status?: string;
  limit: number;
  offset: number;
} & Record<string, unknown>;

export type ListResult<TRow> = {
  rows: TRow[];
  total: number;
};

/**
 * Storage port for `createSurfaceDal`.
 * In-memory test doubles and Postgres adapters implement the same async contract.
 */
export interface StoreAdapter<TRow, TRelated = unknown> {
  get: (id: string) => Promise<TRow | undefined>;
  list: (query: ListQuery) => Promise<ListResult<TRow>>;
  upsert: (row: TRow) => Promise<void>;
  delete: (id: string) => Promise<void>;
  getRelated: (entityId: string) => Promise<TRelated>;
  replaceRelated: (entityId: string, related: TRelated) => Promise<void>;
  isRowVisibleToPrincipal: (
    entityId: string,
    principalId: string,
    rowScope: RowScope | undefined,
    scopeIds?: ScopeId[],
  ) => Promise<boolean>;
}
