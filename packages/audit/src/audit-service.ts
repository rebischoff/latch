import type { AuditEntryInput } from "./types.js";

export type AuditWriter = (entry: AuditEntryInput) => void | Promise<void>;

let auditWriter: AuditWriter | null = null;

export const setAuditWriter = (writer: AuditWriter | null): void => {
  auditWriter = writer;
};

export const writeAudit = async (entry: AuditEntryInput): Promise<void> => {
  if (auditWriter === null) {
    throw new Error(
      "Audit writer not configured — call setAuditWriter() before writeAudit()",
    );
  }
  await auditWriter(entry);
};

export interface MemoryAuditWriter {
  readonly entries: AuditEntryInput[];
  writer: AuditWriter;
  reset: () => void;
}

/** In-memory writer for unit tests and local dev before the DB writer (task 17). */
export const createMemoryAuditWriter = (): MemoryAuditWriter => {
  const entries: AuditEntryInput[] = [];

  const writer: AuditWriter = (entry) => {
    entries.push(structuredClone(entry));
  };

  const reset = (): void => {
    entries.length = 0;
  };

  return { entries, writer, reset };
};
