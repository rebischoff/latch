import type { DatabaseConnections } from "@latch/pg-session";
export type EnsureAuditBootstrapOptions = {
    /** Injected runtime pools (e.g. from `@latch/adapter-neon`). No Neon imports here. */
    getConnections?: () => DatabaseConnections | undefined;
    /** Fallback when pools are unavailable (tests, local without DB). */
    getConnectionString?: () => string | undefined;
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
export declare const createEnsureAuditBootstrap: (options?: EnsureAuditBootstrapOptions) => EnsureAuditBootstrapApi;
//# sourceMappingURL=ensure-audit-writer.d.ts.map