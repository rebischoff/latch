import type { ScopeId } from "@latch/contracts";
import type { ListQuery, ListResult, StoreAdapter } from "@latch/dal";

export type WidgetRow = {
  id: string;
  label: string;
  status: string;
  scope_id: string | null;
};

/**
 * In-memory `widgets` table for harness tests.
 * `visibility` supports `row_scope: own` regression (principal id → row ids).
 */
export class MemoryWidgetStore {
  readonly rows = new Map<string, WidgetRow>();
  readonly visibility = new Map<string, Set<string>>();

  clear = (): void => {
    this.rows.clear();
    this.visibility.clear();
  };

  get = (id: string): WidgetRow | undefined => this.rows.get(id);

  list = (query: ListQuery): ListResult<WidgetRow> => {
    let rows = [...this.rows.values()];
    if (query.rowScope === "own") {
      rows = rows.filter((row) =>
        this.visibility.get(row.id)?.has(query.principalId),
      );
    } else if (query.rowScope === "scope") {
      const scopeIds = query.scopeIds ?? [];
      rows =
        scopeIds.length === 0
          ? []
          : rows.filter(
              (row) =>
                row.scope_id != null &&
                scopeIds.includes(row.scope_id as ScopeId),
            );
    }
    if (query.status !== undefined) {
      rows = rows.filter((row) => row.status === query.status);
    }
    const total = rows.length;
    return {
      rows: rows.slice(query.offset, query.offset + query.limit),
      total,
    };
  };

  upsert = (row: WidgetRow): void => {
    this.rows.set(row.id, row);
  };

  delete = (id: string): void => {
    this.rows.delete(id);
    this.visibility.delete(id);
  };

  isRowVisibleToPrincipal = (
    entityId: string,
    principalId: string,
    rowScope: ListQuery["rowScope"] | undefined,
    scopeIds?: ScopeId[],
  ): boolean => {
    if (rowScope === "own") {
      return this.visibility.get(entityId)?.has(principalId) ?? false;
    }
    if (rowScope === "scope") {
      const row = this.rows.get(entityId);
      if (!row?.scope_id || !scopeIds?.length) {
        return false;
      }
      return scopeIds.includes(row.scope_id as ScopeId);
    }
    return true;
  };

  assignOwner = (widgetId: string, principalId: string): void => {
    const owners = this.visibility.get(widgetId) ?? new Set<string>();
    owners.add(principalId);
    this.visibility.set(widgetId, owners);
  };
}

export const createWidgetStoreAdapter = (
  store: MemoryWidgetStore,
): StoreAdapter<WidgetRow, never> => ({
  get: store.get,
  list: store.list,
  upsert: store.upsert,
  delete: store.delete,
  getRelated: () => undefined as never,
  replaceRelated: () => {},
  isRowVisibleToPrincipal: store.isRowVisibleToPrincipal,
});
