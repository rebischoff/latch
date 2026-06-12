export const LATCH_APP_ROLE = "latch_app";

export const LATCH_APP_ROLE_PASSWORD_DEFAULT = "latch_app";

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
export const applyLatchAppRole = (
  connectionString: string,
  password: string,
): string => {
  const url = new URL(connectionString);
  url.username = LATCH_APP_ROLE;
  url.password = password;
  return url.toString();
};

const assertPostgresUrl = (value: string, label: string): void => {
  if (!value.startsWith("postgres://") && !value.startsWith("postgresql://")) {
    throw new Error(`${label} must start with postgres:// or postgresql://`);
  }
};

const assertNeonRolePassword = (host: string, rolePassword: string): void => {
  if (host.includes(".neon.") && rolePassword === LATCH_APP_ROLE_PASSWORD_DEFAULT) {
    throw new Error(
      "Neon rejects the default latch_app role password. Set LATCH_APP_ROLE_PASSWORD.",
    );
  }
};

/** Parse env vars into pooled runtime + direct migrate URLs (no Pool construction). */
export const resolveDatabaseEnv = (
  env: DatabaseEnv = process.env as DatabaseEnv,
): ResolvedDatabaseEnv => {
  const pooledUrl = env.DATABASE_URL?.trim();
  if (!pooledUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  assertPostgresUrl(pooledUrl, "DATABASE_URL");

  const directUrl = env.DATABASE_URL_DIRECT?.trim() || pooledUrl;
  assertPostgresUrl(directUrl, "DATABASE_URL_DIRECT");

  const rolePassword =
    env.LATCH_APP_ROLE_PASSWORD?.trim() || LATCH_APP_ROLE_PASSWORD_DEFAULT;

  const host = new URL(pooledUrl).hostname;
  assertNeonRolePassword(host, rolePassword);

  return {
    pooledUrl,
    directUrl,
    runtimeConnectionString: applyLatchAppRole(pooledUrl, rolePassword),
    directConnectionString: directUrl,
  };
};
