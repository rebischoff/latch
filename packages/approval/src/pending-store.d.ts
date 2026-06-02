export type PendingStatus = "submitted" | "accepted" | "rejected";
export type PendingChangeInput = {
    surfaceId: string;
    entityId: string;
    fieldIds: string[];
    patch: Record<string, unknown>;
    submittedBy: string;
};
export type PendingChange = PendingChangeInput & {
    id: string;
    status: PendingStatus;
    submittedAt: Date;
    decidedBy?: string;
    decidedAt?: Date;
};
export type PendingResolveInput = {
    status: "accepted" | "rejected";
    decidedBy: string;
};
export type PendingStore = {
    submit: (input: PendingChangeInput) => PendingChange;
    resolve: (id: string, decision: PendingResolveInput) => PendingChange;
    getById: (id: string) => PendingChange | undefined;
    getPendingForEntity: (entityId: string, filter?: {
        surfaceId?: string;
        status?: PendingStatus;
    }) => PendingChange[];
};
export declare class MemoryPendingStore implements PendingStore {
    private readonly byId;
    submit: (input: PendingChangeInput) => PendingChange;
    resolve: (id: string, decision: PendingResolveInput) => PendingChange;
    getById: (id: string) => PendingChange | undefined;
    getPendingForEntity: (entityId: string, filter?: {
        surfaceId?: string;
        status?: PendingStatus;
    }) => PendingChange[];
    clear: () => void;
}
export declare const createMemoryPendingStore: () => MemoryPendingStore;
//# sourceMappingURL=pending-store.d.ts.map