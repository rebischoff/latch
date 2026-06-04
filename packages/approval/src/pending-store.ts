export type PendingStatus =
  | "submitted"
  | "accepted"
  | "rejected"
  | "withdrawn";

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
  getPendingForEntity: (
    entityId: string,
    filter?: { surfaceId?: string; status?: PendingStatus },
  ) => Promise<PendingChange[]>;
};

export class MemoryPendingStore implements PendingStore {
  private readonly byId = new Map<string, PendingChange>();

  submit = async (input: PendingChangeInput): Promise<PendingChange> => {
    const record: PendingChange = {
      ...input,
      id: crypto.randomUUID(),
      status: "submitted",
      submittedAt: new Date(),
    };
    this.byId.set(record.id, record);
    return record;
  };

  resolve = async (
    id: string,
    decision: PendingResolveInput,
  ): Promise<PendingChange> => {
    const existing = this.byId.get(id);
    if (!existing) {
      throw new Error(`Pending change not found: ${id}`);
    }
    if (existing.status !== "submitted") {
      throw new Error(`Pending change ${id} is not submitted`);
    }
    const updated: PendingChange = {
      ...existing,
      status: decision.status,
      decidedBy: decision.decidedBy,
      decidedAt: new Date(),
      ...(decision.comment !== undefined ? { comment: decision.comment } : {}),
    };
    this.byId.set(id, updated);
    return updated;
  };

  getById = async (id: string): Promise<PendingChange | undefined> =>
    this.byId.get(id);

  getPendingForEntity = async (
    entityId: string,
    filter?: { surfaceId?: string; status?: PendingStatus },
  ): Promise<PendingChange[]> =>
    [...this.byId.values()].filter((p) => {
      if (p.entityId !== entityId) {
        return false;
      }
      if (filter?.surfaceId !== undefined && p.surfaceId !== filter.surfaceId) {
        return false;
      }
      if (filter?.status !== undefined && p.status !== filter.status) {
        return false;
      }
      return true;
    });

  clear = (): void => {
    this.byId.clear();
  };
}

export const createMemoryPendingStore = (): MemoryPendingStore =>
  new MemoryPendingStore();
