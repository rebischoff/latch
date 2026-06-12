import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { findMonorepoRoot } from "./workspace-root.js";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_DIR = join(PACKAGE_ROOT, "template");

const SLUG_RE = /^[a-z][a-z0-9_-]*$/;

export type AuditMode = "full" | "standard" | "recovery";

export const AUDIT_MODES: readonly AuditMode[] = [
  "full",
  "standard",
  "recovery",
] as const;

export const parseAuditMode = (raw: string): AuditMode => {
  if ((AUDIT_MODES as readonly string[]).includes(raw)) {
    return raw as AuditMode;
  }
  throw new Error(
    `Invalid audit mode "${raw}". Expected one of: ${AUDIT_MODES.join(", ")}`,
  );
};

const TEXT_EXTENSIONS = new Set([
  ".css",
  ".example",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

export type ScaffoldTarget = {
  /** Slug used for package name / tokens. */
  slug: string;
  /** Absolute directory the app is written into. */
  targetDir: string;
  /** Human-friendly path shown in CLI output (relative when possible). */
  label: string;
  /** True when scaffolding from inside a Latch monorepo. */
  isMonorepo: boolean;
  /** Monorepo root, when `isMonorepo`. */
  monorepoRoot?: string;
};

const toPackageName = (slug: string): string =>
  `@latch/${slug.replace(/_/g, "-")}`;

const toCamelCase = (slug: string): string =>
  slug
    .split(/[_-]+/)
    .map((part, index) =>
      index === 0
        ? part.toLowerCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("");

const toTitle = (slug: string): string =>
  slug
    .split(/[_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

/** Dev ports already claimed by sibling package.json files. */
const collectUsedPorts = (searchDir: string): Set<number> => {
  const ports = new Set<number>();
  if (!existsSync(searchDir)) {
    return ports;
  }

  for (const entry of readdirSync(searchDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const packagePath = join(searchDir, entry.name, "package.json");
    if (!existsSync(packagePath)) {
      continue;
    }
    const pkg = readFileSync(packagePath, "utf8");
    for (const match of pkg.matchAll(/--port\s+(\d{4,5})/g)) {
      ports.add(Number.parseInt(match[1], 10));
    }
  }

  return ports;
};

const nextDevPort = (searchDir: string | undefined): number => {
  if (!searchDir) {
    return 3000;
  }
  const used = collectUsedPorts(searchDir);
  let port = 3003;
  while (used.has(port)) {
    port += 1;
  }
  return port;
};

const shouldSubstitute = (filePath: string): boolean => {
  const name = basename(filePath);
  if (name === ".gitkeep") {
    return false;
  }
  const dot = name.lastIndexOf(".");
  const ext = dot === -1 ? "" : name.slice(dot);
  return TEXT_EXTENSIONS.has(ext) || name.startsWith(".env");
};

const substituteTokens = (
  content: string,
  tokens: Record<string, string>,
): string => {
  let out = content;
  for (const [token, value] of Object.entries(tokens)) {
    out = out.split(token).join(value);
  }
  return out;
};

const walkAndSubstitute = (
  dir: string,
  tokens: Record<string, string>,
): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAndSubstitute(fullPath, tokens);
      continue;
    }
    if (!shouldSubstitute(fullPath)) {
      continue;
    }
    const raw = readFileSync(fullPath, "utf8");
    writeFileSync(fullPath, substituteTokens(raw, tokens), "utf8");
  }
};

/**
 * Resolve where a new app named `rawSlug` should be scaffolded.
 *
 * - Inside a Latch monorepo  → `<root>/<slug>` (sibling to `packages/`).
 * - Standalone (no monorepo) → `<cwd>/<slug>`, or `<cwd>` in place when the
 *   slug is `.` (slug then derived from the directory name).
 */
export const resolveScaffoldTarget = (
  rawSlug: string,
  cwd: string = process.cwd(),
): ScaffoldTarget => {
  const monorepoRoot = findMonorepoRoot(cwd);
  const inPlace = rawSlug === ".";
  const slug = inPlace ? basename(resolve(cwd)) : rawSlug;

  if (!SLUG_RE.test(slug)) {
    throw new Error(
      `Invalid app name "${slug}". Use lowercase letters, digits, underscores, or hyphens; must start with a letter.`,
    );
  }

  if (monorepoRoot) {
    const targetDir = join(monorepoRoot, slug);
    return {
      slug,
      targetDir,
      label: `./${slug}`,
      isMonorepo: true,
      monorepoRoot,
    };
  }

  const targetDir = inPlace ? resolve(cwd) : join(resolve(cwd), slug);
  return {
    slug,
    targetDir,
    label: inPlace ? "." : `./${slug}`,
    isMonorepo: false,
  };
};

const assertWritable = (target: ScaffoldTarget): void => {
  if (existsSync(join(target.targetDir, "package.json"))) {
    throw new Error(
      `${target.label} already contains a package.json — pick another name or directory.`,
    );
  }
};

export type ScaffoldOptions = {
  /** Scaffold-time audit mode — seeds `latch_app_config.audit_mode` (default `full`). */
  auditMode?: AuditMode;
};

type RootPackageJson = {
  workspaces?: string[] | { packages?: string[] };
};

const workspacePatterns = (pkg: RootPackageJson): string[] => {
  if (Array.isArray(pkg.workspaces)) {
    return pkg.workspaces;
  }
  return pkg.workspaces?.packages ?? [];
};

const workspaceEntryForSlug = (slug: string): string => slug;

const isSlugRegistered = (patterns: string[], slug: string): boolean =>
  patterns.some(
    (pattern) =>
      pattern === slug ||
      pattern === `./${slug}` ||
      pattern === `${slug}/*` ||
      pattern === `./${slug}/*`,
  );

/** Append a consumer app folder to the monorepo root `workspaces` list. */
export const registerMonorepoWorkspace = (
  monorepoRoot: string,
  slug: string,
): boolean => {
  const rootPackagePath = join(monorepoRoot, "package.json");
  if (!existsSync(rootPackagePath)) {
    throw new Error(`Monorepo root is missing package.json: ${rootPackagePath}`);
  }

  const pkg = JSON.parse(readFileSync(rootPackagePath, "utf8")) as RootPackageJson;
  const patterns = workspacePatterns(pkg);
  if (isSlugRegistered(patterns, slug)) {
    return false;
  }

  const entry = workspaceEntryForSlug(slug);
  const nextPatterns = [...patterns, entry];

  if (Array.isArray(pkg.workspaces)) {
    pkg.workspaces = nextPatterns;
  } else if (pkg.workspaces && "packages" in pkg.workspaces) {
    pkg.workspaces.packages = nextPatterns;
  } else {
    pkg.workspaces = nextPatterns;
  }

  writeFileSync(rootPackagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  return true;
};

const patchAppConfigSeed = (targetDir: string, auditMode: AuditMode): void => {
  if (auditMode === "full") {
    return;
  }
  const migrationPath = join(
    targetDir,
    "migrations",
    "012_latch_app_config.sql",
  );
  if (!existsSync(migrationPath)) {
    throw new Error(`Expected migration not found: ${migrationPath}`);
  }
  const sql = readFileSync(migrationPath, "utf8");
  const patched = sql.replace(
    /INSERT INTO latch_app_config \(id, audit_mode\) VALUES \(1, 'full'\);/,
    `INSERT INTO latch_app_config (id, audit_mode) VALUES (1, '${auditMode}');`,
  );
  if (patched === sql) {
    throw new Error(
      "Could not patch latch_app_config seed — migration shape changed",
    );
  }
  writeFileSync(migrationPath, patched, "utf8");
};

/** Copy + token-substitute the golden template into the resolved target. */
export const scaffoldApp = (
  target: ScaffoldTarget,
  options: ScaffoldOptions = {},
): { port: string } => {
  if (!existsSync(TEMPLATE_DIR)) {
    throw new Error(`Template not found: ${TEMPLATE_DIR}`);
  }
  assertWritable(target);

  const portSearchDir = target.monorepoRoot ?? dirname(target.targetDir);
  const port = String(nextDevPort(portSearchDir));

  mkdirSync(target.targetDir, { recursive: true });
  cpSync(TEMPLATE_DIR, target.targetDir, { recursive: true });

  walkAndSubstitute(target.targetDir, {
    __APP_SLUG__: target.slug,
    __APP_PACKAGE__: toPackageName(target.slug),
    __APP_TITLE__: toTitle(target.slug),
    __APP_PORT__: port,
    __APP_REGISTRY__: `${toCamelCase(target.slug)}Registry`,
  });

  patchAppConfigSeed(target.targetDir, options.auditMode ?? "full");

  if (target.isMonorepo && target.monorepoRoot) {
    registerMonorepoWorkspace(target.monorepoRoot, target.slug);
  }

  return { port };
};

export { toPackageName };
