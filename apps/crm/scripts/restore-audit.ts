#!/usr/bin/env node
/**
 * Operator CLI: replay a hard delete from `latch_audit` (Phase 04 task 07).
 *
 * Usage:
 *   npm run restore-audit -- <audit-id> --actor <principal-id>
 *
 * Requires `DATABASE_URL` (apps/crm/.env.local or env) to load the audit row.
 * Replays into the pilot memory store (same as local dev without a Postgres DAL).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { restoreFromAuditEntry, setAuditWriter } from "@latch/audit";
import { PolicyService } from "@latch/policy";
import { Pool } from "pg";

import { fetchAuditEntryById } from "../src/lib/restore/fetch-audit.js";
import { createCrmRestoreDeps } from "../src/lib/restore/replay.js";
import { jobPolicyRegistry } from "../src/lib/policy/registry.js";
import { getPilotStore } from "../src/lib/pilot-store.js";
import { createPostgresAuditWriter } from "../src/lib/audit-db-writer.js";
import { principalFromStore } from "../test-utils/index.js";
import type { PolicyScope } from "@latch/contracts";

const envLocalPath = resolve("apps/crm/.env.local");

const parseEnvValue = (raw: string): string => {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
};

const readDatabaseUrlFromFile = (): string | undefined => {
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
    if (match) {
      return parseEnvValue(match[1] ?? "");
    }
  }
  return undefined;
};

const parseArgs = (): { auditId: string; actorId: string } => {
  const argv = process.argv.slice(2);
  const auditId = argv.find((a) => !a.startsWith("-"));
  const actorIdx = argv.indexOf("--actor");
  const actorId = actorIdx >= 0 ? argv[actorIdx + 1] : undefined;

  if (!auditId || !actorId) {
    console.error(
      "Usage: npm run restore-audit -- <audit-id> --actor <principal-id>",
    );
    process.exit(1);
  }
  return { auditId, actorId };
};

const scopeForModule = (
  moduleId: string,
  entityId: string,
): PolicyScope | null => {
  switch (moduleId) {
    case "job_detail":
      return { surface: "job_detail", entityId, mode: "detail" };
    case "job_list":
      return { surface: "job_list", mode: "list" };
    case "customer_detail":
      return { surface: "customer_detail", entityId, mode: "detail" };
    case "user_roles_detail":
      return { surface: "user_roles_detail", entityId, mode: "detail" };
    default:
      return null;
  }
};

const main = async (): Promise<void> => {
  const { auditId, actorId } = parseArgs();
  const databaseUrl = process.env.DATABASE_URL ?? readDatabaseUrlFromFile();
  if (!databaseUrl) {
    console.error("DATABASE_URL is required to load the audit row.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const entry = await fetchAuditEntryById(pool, auditId);
  await pool.end();

  if (!entry) {
    console.error(`Audit entry not found: ${auditId}`);
    process.exit(1);
  }

  if (!entry.moduleId) {
    console.error("Audit row is missing module_id — cannot resolve Surface.");
    process.exit(1);
  }

  const scope = scopeForModule(entry.moduleId, entry.recordId);
  if (!scope) {
    console.error(`Unsupported module_id: ${entry.moduleId}`);
    process.exit(1);
  }

  const store = getPilotStore();
  const principal = await principalFromStore(store, actorId);
  const policy = new PolicyService({ registry: jobPolicyRegistry });
  const manifest = policy.resolve(principal, scope);
  const ctx = {
    principal,
    manifest,
    surface: entry.moduleId,
  };

  const pgAudit = createPostgresAuditWriter(databaseUrl);
  setAuditWriter(pgAudit.writer);

  try {
    await restoreFromAuditEntry(auditId, ctx, {
      getAuditEntry: async () => entry,
      ...createCrmRestoreDeps(store),
    });
    console.log(
      `Restored ${entry.tableName} ${entry.recordId} from audit ${auditId}`,
    );
  } finally {
    await pgAudit.close();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
