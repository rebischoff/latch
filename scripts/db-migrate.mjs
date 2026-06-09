#!/usr/bin/env node
/**
 * Apply apps/<app>/migrations/*.sql in lexical order (matches CI).
 * Loads DATABASE_URL from apps/<app>/.env.local first, then the shell env.
 *
 * Usage:
 *   node scripts/db-migrate.mjs              # CRM (default)
 *   node scripts/db-migrate.mjs --app=test1
 *   node scripts/db-migrate.mjs --app=spike_policy
 *   node scripts/db-migrate.mjs --app=crm --check
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const APPS = {
  crm: {
    envLocalPath: resolve("apps/crm/.env.local"),
    migrationsDir: resolve("apps/crm/migrations"),
  },
  test1: {
    envLocalPath: resolve("apps/test1/.env.local"),
    migrationsDir: resolve("apps/test1/migrations"),
  },
  spike_policy: {
    envLocalPath: resolve("apps/spike_policy/.env.local"),
    migrationsDir: resolve("apps/spike_policy/migrations"),
  },
};

const appArg = process.argv.find((a) => a.startsWith("--app="))?.slice("--app=".length) ?? "crm";
const appConfig = APPS[appArg];

if (!appConfig) {
  console.error(
    `Unknown --app=${appArg}. Supported: ${Object.keys(APPS).join(", ")}`,
  );
  process.exit(1);
}

const { envLocalPath, migrationsDir } = appConfig;
const checkOnly = process.argv.includes("--check");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyFile = onlyArg?.slice("--only=".length);

const parseEnvValue = (raw) => {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
};

const readEnvLocal = () => {
  if (!existsSync(envLocalPath)) {
    return {};
  }
  const values = {};
  const content = readFileSync(envLocalPath, "utf8").replace(/^\uFEFF/, "");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const match = trimmed.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }
    values[match[1]] = parseEnvValue(match[2]);
  }
  return values;
};

const validateDatabaseUrl = (databaseUrl, source) => {
  if (!databaseUrl) {
    console.error(
      "DATABASE_URL is not set.\n" +
        `  Looked in: ${envLocalPath} and process.env.DATABASE_URL\n` +
        `  Add a Neon direct connection string to ${envLocalPath}:\n` +
        "    DATABASE_URL=postgresql://...@ep-....neon.tech/neondb?sslmode=require",
    );
    process.exit(1);
  }

  if (
    !databaseUrl.startsWith("postgres://") &&
    !databaseUrl.startsWith("postgresql://")
  ) {
    console.error(
      `DATABASE_URL from ${source} must start with postgres:// or postgresql://\n` +
        `  Got: ${databaseUrl.slice(0, 40)}${databaseUrl.length > 40 ? "…" : ""}`,
    );
    process.exit(1);
  }

  let host = "(unknown)";
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    console.error(`DATABASE_URL from ${source} is not a valid URL.`);
    process.exit(1);
  }

  return host;
};

const envLocal = readEnvLocal();
const fromFile = envLocal.DATABASE_URL;
const fromEnv = process.env.DATABASE_URL?.trim() || undefined;
const databaseUrl = fromFile ?? fromEnv;
const source = fromFile
  ? envLocalPath
  : fromEnv
    ? "process.env.DATABASE_URL"
    : "none";

const host = validateDatabaseUrl(databaseUrl, source);

if (fromEnv && fromFile && fromEnv !== fromFile) {
  console.warn(
    `Note: shell DATABASE_URL differs from ${envLocalPath} — using .env.local for migrate.`,
  );
  console.warn(
    "  To use the shell value instead: unset DATABASE_URL or remove .env.local entry.",
  );
}

if (host.includes("-pooler")) {
  console.warn(
    "Note: connection uses Neon pooler host. Migrations usually work; prefer Direct connection if you see errors.",
  );
}

if (checkOnly) {
  console.log(`OK  app=${appArg}  source=${source}  host=${host}`);
  process.exit(0);
}

const LATCH_APP_ROLE_PASSWORD_DEFAULT = "latch_app";
const latchAppRolePassword =
  envLocal.LATCH_APP_ROLE_PASSWORD?.trim() ||
  process.env.LATCH_APP_ROLE_PASSWORD?.trim() ||
  LATCH_APP_ROLE_PASSWORD_DEFAULT;

if (
  host.includes(".neon.") &&
  latchAppRolePassword === LATCH_APP_ROLE_PASSWORD_DEFAULT
) {
  console.error(
    "Neon rejects the default latch_app role password.\n" +
      `  Set LATCH_APP_ROLE_PASSWORD in ${envLocalPath}\n` +
      "  Example: openssl rand -base64 24",
  );
  process.exit(1);
}

const allMigrations = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => resolve(migrationsDir, name));

const migrations = onlyFile
  ? allMigrations.filter((path) => path.endsWith(onlyFile))
  : allMigrations;

if (onlyFile && migrations.length === 0) {
  console.error(`No migration matching --only=${onlyFile}`);
  process.exit(1);
}

for (const migration of migrations) {
  console.log(`Applying ${migration}…`);
  const result = spawnSync(
    "psql",
    [
      "-d",
      databaseUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-v",
      `latch_app_password=${latchAppRolePassword}`,
      "-f",
      migration,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Done (${migrations.length} migration(s)).`);
