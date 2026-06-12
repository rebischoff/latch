import type { StoreAdapter } from "@latch/dal";
import type { Pool } from "pg";
/** Maps a row property to a physical SQL column on the anchor table. */
export type PgColumnBinding = {
    property: string;
    column: string;
};
export type PgColumnMap = Record<string, readonly string[]>;
export type CreatePgStoreAdapterOptions<TRow extends {
    id: string;
}> = {
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
/** Build column bindings from codegen `columnMap` (single-table surfaces only). */
export declare const columnBindingsFromMap: (columnMap: PgColumnMap) => PgColumnBinding[];
export declare const createPgStoreAdapter: <TRow extends {
    id: string;
}, TRelated = unknown>(options: CreatePgStoreAdapterOptions<TRow>) => StoreAdapter<TRow, TRelated>;
//# sourceMappingURL=create-pg-store-adapter.d.ts.map