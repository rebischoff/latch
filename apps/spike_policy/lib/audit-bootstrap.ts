import {
  createMemoryAuditWriter,
  setAuditWriter,
  type AuditWriter,
} from "@latch/audit";

import { createPostgresAuditWriter } from "./audit-db-writer";

type SpikeAuditGlobal = {
  auditWriter?: AuditWriter;
};

const spikeGlobal = (): SpikeAuditGlobal => {
  const root = globalThis as typeof globalThis & {
    __latchSpikeAudit?: SpikeAuditGlobal;
  };
  if (!root.__latchSpikeAudit) {
    root.__latchSpikeAudit = {};
  }
  return root.__latchSpikeAudit;
};

/** Re-apply writer after HMR can reset the `@latch/audit` module singleton. */
export const ensureAuditWriter = (): void => {
  const g = spikeGlobal();
  if (!g.auditWriter) {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    g.auditWriter = databaseUrl
      ? createPostgresAuditWriter(databaseUrl).writer
      : createMemoryAuditWriter().writer;
  }
  setAuditWriter(g.auditWriter);
};
