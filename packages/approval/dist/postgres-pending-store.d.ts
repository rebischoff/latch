import { Pool } from "pg";
import type { PendingChange, PendingChangeInput, PendingResolveInput, PendingStatus, PendingStore } from "./pending-store.js";
export declare class PostgresPendingStore implements PendingStore {
    private readonly pool;
    constructor(pool: Pool);
    submit: (input: PendingChangeInput) => Promise<PendingChange>;
    resolve: (id: string, decision: PendingResolveInput) => Promise<PendingChange>;
    getById: (id: string) => Promise<PendingChange | undefined>;
    getPendingForEntity: (entityId: string, filter?: {
        surfaceId?: string;
        status?: PendingStatus;
    }) => Promise<PendingChange[]>;
    private insertSubmitted;
}
export type PostgresPendingStoreHandle = {
    store: PendingStore;
    pool: Pool;
    close: () => Promise<void>;
};
/** Persist pending rows in `latch_pending_changes` (survives process restart). */
export declare const createPostgresPendingStore: (connectionString: string) => PostgresPendingStoreHandle;
//# sourceMappingURL=postgres-pending-store.d.ts.map