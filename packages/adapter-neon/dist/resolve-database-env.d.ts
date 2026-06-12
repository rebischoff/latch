export declare const LATCH_APP_ROLE = "latch_app";
export declare const LATCH_APP_ROLE_PASSWORD_DEFAULT = "latch_app";
export type DatabaseEnv = {
    DATABASE_URL?: string;
    DATABASE_URL_DIRECT?: string;
    LATCH_APP_ROLE_PASSWORD?: string;
};
export type ResolvedDatabaseEnv = {
    pooledUrl: string;
    directUrl: string;
    runtimeConnectionString: string;
    directConnectionString: string;
};
/** Rewrite connection URL credentials to the least-privilege app role. */
export declare const applyLatchAppRole: (connectionString: string, password: string) => string;
/** Parse env vars into pooled runtime + direct migrate URLs (no Pool construction). */
export declare const resolveDatabaseEnv: (env?: DatabaseEnv) => ResolvedDatabaseEnv;
//# sourceMappingURL=resolve-database-env.d.ts.map