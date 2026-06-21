#!/usr/bin/env node
/**
 * Strip `.js` suffixes from relative import/export specifiers (bundler monorepo convention).
 *
 * Usage:
 *   node scripts/codemod-extensionless-imports.mjs packages/adapter-neon/src
 *   node scripts/codemod-extensionless-imports.mjs apps/subhub/lib
 *
 * Only touches `.ts` / `.tsx` files. Skips `dist/`, `generated/`, and `node_modules/`.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELATIVE_JS_SPECIFIER =
  /(["'])(\.\.?\/[^"']+)\.js\1/g;

const SKIP_DIRS = new Set(["node_modules", "dist", "generated", ".git"]);

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

async function codemodFile(filePath) {
  const original = await readFile(filePath, "utf8");
  const updated = original.replace(RELATIVE_JS_SPECIFIER, "$1$2$1");
  if (updated === original) return false;
  await writeFile(filePath, updated, "utf8");
  return true;
}

async function main() {
  const roots = process.argv.slice(2);
  if (roots.length === 0) {
    console.error(
      "Usage: node scripts/codemod-extensionless-imports.mjs <dir> [<dir> ...]",
    );
    process.exit(1);
  }

  let changed = 0;
  let scanned = 0;

  for (const root of roots) {
    const absRoot = path.resolve(root);
    for await (const file of walk(absRoot)) {
      scanned += 1;
      if (await codemodFile(file)) {
        changed += 1;
        console.log(path.relative(process.cwd(), file));
      }
    }
  }

  console.log(`\nScanned ${scanned} files; updated ${changed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
