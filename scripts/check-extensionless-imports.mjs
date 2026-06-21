#!/usr/bin/env node
/**
 * CI guardrail: fail on relative import/export specifiers ending in `.js` or `.mjs`.
 *
 * Bundler monorepo convention — see packages/_docs/foundations/typescript-monorepo.md
 *
 * Usage:
 *   node scripts/check-extensionless-imports.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOTS = ["apps", "packages"];

const RELATIVE_JS_IMPORT =
  /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+from\s+)?(['"])(\.\.?\/[^'"]+)\.(js|mjs)\1/g;

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "generated",
  ".git",
  ".next",
  "out",
  "build",
]);

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (/\.tsx?$/.test(entry.name)) {
      yield full;
    }
  }
}

function isPackageSrc(filePath) {
  const normalized = filePath.split(path.sep);
  const packagesIdx = normalized.indexOf("packages");
  if (packagesIdx === -1) return false;
  return normalized[packagesIdx + 2] === "src";
}

function isAppSource(filePath) {
  return filePath.split(path.sep).includes("apps");
}

async function scanFile(filePath) {
  const content = await readFile(filePath, "utf8");
  const violations = [];
  for (const match of content.matchAll(RELATIVE_JS_IMPORT)) {
    violations.push(match[0]);
  }
  return violations;
}

async function main() {
  const failures = [];

  for (const root of ROOTS) {
    const absRoot = path.resolve(root);
    for await (const file of walk(absRoot)) {
      const rel = path.relative(process.cwd(), file);
      if (root === "packages" && !isPackageSrc(file)) continue;
      if (root === "apps" && !isAppSource(file)) continue;

      const violations = await scanFile(file);
      if (violations.length > 0) {
        failures.push({ file: rel, violations });
      }
    }
  }

  if (failures.length === 0) {
    console.log("check-extensionless-imports: OK");
    return;
  }

  console.error(
    "Relative imports must be extensionless (no .js / .mjs suffixes):\n",
  );
  for (const { file, violations } of failures) {
    console.error(`  ${file}`);
    for (const v of violations) {
      console.error(`    ${v.trim()}`);
    }
  }
  console.error(
    `\n${failures.length} file(s) failed. See packages/_docs/foundations/typescript-monorepo.md`,
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
