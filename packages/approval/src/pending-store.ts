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
  getPendingForEntity: (
    entityId: string,
    filter?: { surfaceId?: string; status?: PendingStatus },
  ) => PendingChange[];
};

export class MemoryPendingStore implements PendingStore {
  private readonly byId = new Map<string, PendingChange>();

  submit = (input: PendingChangeInput): PendingChange => {
    const record: PendingChange = {
      ...input,
      id: crypto.randomUUID(),
      status: "submitted",
      submittedAt: new Date(),
    };
    this.byId.set(record.id, record);
    return record;
  };

  resolve = (id: string, decision: PendingResolveInput): PendingChange => {
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
    };
    this.byId.set(id, updated);
    return updated;
  };

  getById = (id: string): PendingChange | undefined => this.byId.get(id);

  getPendingForEntity = (
    entityId: string,
    filter?: { surfaceId?: string; status?: PendingStatus },
  ): PendingChange[] =>
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
