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
};

export type ListResult<TRow> = {
  rows: TRow[];
  total: number;
};

/**
 * Storage port for `createSurfaceDal`.
 * In-memory and Postgres adapters implement the same contract.
 */
export interface StoreAdapter<TRow, TRelated = unknown> {
  get: (id: string) => TRow | undefined;
  list: (query: ListQuery) => ListResult<TRow>;
  upsert: (row: TRow) => void;
  delete: (id: string) => void;
  getRelated: (entityId: string) => TRelated;
  replaceRelated: (entityId: string, related: TRelated) => void;
  isRowVisibleToPrincipal: (
    entityId: string,
    principalId: string,
    rowScope: RowScope | undefined,
    scopeIds?: ScopeId[],
  ) => boolean;
}
