import {
  createMemoryAuditWriter,
  setAuditMode,
  setAuditWriter,
  type AuditWriter,
} from "@latch/audit";
import {
  createPostgresAuditWriter,
  readAuditModeFromPool,
} from "@latch/adapter-pg-audit";
import type { DatabaseConnections } from "@latch/pg-session";

export type EnsureAuditBootstrapOptions = {
  /** Injected runtime pools (e.g. from `@latch/adapter-neon`). No Neon imports here. */
  getConnections?: () => DatabaseConnections | undefined;
  /** Fallback when pools are unavailable (tests, local without DB). */
  getConnectionString?: () => string | undefined;
};

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

const resolveConnectionString = (
  options: EnsureAuditBootstrapOptions,
): string | undefined => {
  const explicit = options.getConnectionString?.()?.trim();
  if (explicit) {
    return explicit;
  }
  const pool = options.getConnections?.()?.pool;
  const fromPool = (
    pool?.options as { connectionString?: string } | undefined
  )?.connectionString?.trim();
  if (fromPool) {
    return fromPool;
  }
  return process.env.DATABASE_URL?.trim();
};

export type EnsureAuditBootstrapApi = {
  /** Re-apply writer after HMR can reset the `@latch/audit` module singleton. */
  ensureAuditWriter: () => void;
  /** Load runtime-immutable audit mode from `latch_app_config` once per process. */
  ensureAuditMode: () => Promise<void>;
  /** Writer + audit mode bootstrap for server entrypoints. */
  ensureAuditBootstrap: () => Promise<void>;
};

/** Wires `@latch/adapter-pg-audit` (or memory fallback) into `@latch/audit`. */
export const createEnsureAuditBootstrap = (
  options: EnsureAuditBootstrapOptions = {},
): EnsureAuditBootstrapApi => {
  const ensureAuditWriter = (): void => {
    const g = appGlobal();
    if (!g.auditWriter) {
      const connectionString = resolveConnectionString(options);
      g.auditWriter = connectionString
        ? createPostgresAuditWriter(connectionString).writer
        : createMemoryAuditWriter().writer;
    }
    setAuditWriter(g.auditWriter);
  };

  let auditModeLoaded = false;

  const ensureAuditMode = async (): Promise<void> => {
    const pool = options.getConnections?.()?.pool;
    if (auditModeLoaded || !pool) {
      return;
    }
    setAuditMode(await readAuditModeFromPool(pool));
    auditModeLoaded = true;
  };

  const ensureAuditBootstrap = async (): Promise<void> => {
    ensureAuditWriter();
    await ensureAuditMode();
  };

  return { ensureAuditWriter, ensureAuditMode, ensureAuditBootstrap };
};
