#!/usr/bin/env node
/**
 * Smoke test: policy → DAL list for seed-field-tech vs seed-office-admin.
 * Usage: node scripts/smoke-jobs-list.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(import.meta.dirname, "../.env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const match = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) {
    process.env[match[1]] ??= match[2].replace(/^['"]|['"]$/g, "");
  }
}

const { PolicyService } = await import("@latch/policy");
const { principalRoleIds } = await import("@latch/contracts");
const { loadPrincipalFromDb } = await import(
  "@latch/adapter-better-auth"
);
const { preloadRoleGrantsFromDb } = await import("@latch/app-kit");
const { Pool } = await import("pg");

const { tempAppRegistry } = await import("../lib/policy-registry.ts");
const { jobListDal } = await import("../lib/jobs/dal.ts");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const runAs = async (userId) => {
  const principal = await loadPrincipalFromDb(pool, userId);
  const grantProvider = await preloadRoleGrantsFromDb(
    pool,
    principalRoleIds(principal),
  );
  const policy = new PolicyService({
    registry: tempAppRegistry,
    grantProvider,
  });
  const manifest = policy.resolve(principal, {
    surface: "job_list",
    mode: "list",
  });
  const ctx = { principal, manifest, surface: "job_list" };
  const { rows, total } = await jobListDal.list(ctx);
  return {
    userId,
    rowScope: manifest.rowScope,
    total,
    ids: rows.map((r) => r.id),
    hasFinancial: rows.some((r) => "financial_terms" in r),
  };
};

try {
  const tech = await runAs("seed-field-tech");
  const admin = await runAs("seed-office-admin");
  console.log(JSON.stringify({ tech, admin }, null, 2));
} finally {
  await pool.end();
}
