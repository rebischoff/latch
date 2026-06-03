#!/usr/bin/env node
/**
 * Apply apps/crm/migrations/001_init.sql.
 * Loads DATABASE_URL from apps/crm/.env.local first, then the shell env.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envLocalPath = resolve("apps/crm/.env.local");
const checkOnly = process.argv.includes("--check");

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

const readDatabaseUrlFromFile = () => {
  if (!existsSync(envLocalPath)) {
    return undefined;
  }
  const content = readFileSync(envLocalPath, "utf8").replace(/^\uFEFF/, "");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const match = trimmed.match(/^(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }
    return parseEnvValue(match[1]);
  }
  return undefined;
};

const validateDatabaseUrl = (databaseUrl, source) => {
  if (!databaseUrl) {
    console.error(
      "DATABASE_URL is not set.\n" +
        `  Looked in: ${envLocalPath} and process.env.DATABASE_URL\n` +
        "  Add a Neon direct connection string to apps/crm/.env.local:\n" +
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

const fromFile = readDatabaseUrlFromFile();
const fromEnv = process.env.DATABASE_URL?.trim() || undefined;
const databaseUrl = fromFile ?? fromEnv;
const source = fromFile
  ? "apps/crm/.env.local"
  : fromEnv
    ? "process.env.DATABASE_URL"
    : "none";

const host = validateDatabaseUrl(databaseUrl, source);

if (fromEnv && fromFile && fromEnv !== fromFile) {
  console.warn(
    "Note: shell DATABASE_URL differs from apps/crm/.env.local — using .env.local for migrate.",
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
  console.log(`OK  source=${source}  host=${host}`);
  process.exit(0);
}

const migration = resolve("apps/crm/migrations/001_init.sql");
const result = spawnSync("psql", ["-d", databaseUrl, "-f", migration], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
