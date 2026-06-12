export type PendingStatus = "submitted" | "accepted" | "rejected" | "withdrawn";
export type PendingChangeInput = {
    surfaceId: string;
    entityId: string;
    fieldIds: string[];
    patch: Record<string, unknown>;
    submittedBy: string;
    /** Shared id when created from bulk update (nullable for single patch). */
    batchId?: string;
};
export type PendingChange = PendingChangeInput & {
    id: string;
    status: PendingStatus;
    submittedAt: Date;
    decidedBy?: string;
    decidedAt?: Date;
    comment?: string;
    batchId?: string;
};
export type PendingResolveInput = {
    status: "accepted" | "rejected" | "withdrawn";
    decidedBy: string;
    comment?: string;
};
export type PendingStore = {
    submit: (input: PendingChangeInput) => Promise<PendingChange>;
    resolve: (id: string, decision: PendingResolveInput) => Promise<PendingChange>;
    getById: (id: string) => Promise<PendingChange | undefined>;
    getPendingForEntity: (entityId: string, filter?: {
        surfaceId?: string;
        status?: PendingStatus;
    }) => Promise<PendingChange[]>;
};
export declare class MemoryPendingStore implements PendingStore {
    private readonly byId;
    submit: (input: PendingChangeInput) => Promise<PendingChange>;
    resolve: (id: string, decision: PendingResolveInput) => Promise<PendingChange>;
    getById: (id: string) => Promise<PendingChange | undefined>;
    getPendingForEntity: (entityId: string, filter?: {
        surfaceId?: string;
        status?: PendingStatus;
    }) => Promise<PendingChange[]>;
    clear: () => void;
}
export declare const createMemoryPendingStore: () => MemoryPendingStore;
//# sourceMappingURL=pending-store.d.ts.map