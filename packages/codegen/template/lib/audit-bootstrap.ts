import {
  createMemoryAuditWriter,
  setAuditWriter,
  type AuditWriter,
} from "@latch/audit";

import { createPostgresAuditWriter } from "./audit-db-writer";

type AppAuditGlobal = {
  auditWriter?: AuditWriter;
};

const appGlobal = (): AppAuditGlobal => {
  const root = globalThis as typeof globalThis & {
    __latchAppAudit?: AppAuditGlobal;
  };
  if (!root.__latchAppAudit) {
    root.__latchAppAudit = {};
  }
  return root.__latchAppAudit;
};

/** Re-apply writer after HMR can reset the `@latch/audit` module singleton. */
export const ensureAuditWriter = (): void => {
  const g = appGlobal();
  if (!g.auditWriter) {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    g.auditWriter = databaseUrl
      ? createPostgresAuditWriter(databaseUrl).writer
      : createMemoryAuditWriter().writer;
  }
  setAuditWriter(g.auditWriter);
};
