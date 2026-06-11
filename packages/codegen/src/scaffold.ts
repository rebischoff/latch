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
  /** True when scaffolding into a Latch monorepo's `apps/`. */
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

/** Dev ports already claimed by sibling apps (monorepo only). */
const collectUsedPorts = (appsDir: string): Set<number> => {
  const ports = new Set<number>();
  if (!existsSync(appsDir)) {
    return ports;
  }

  for (const entry of readdirSync(appsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const packagePath = join(appsDir, entry.name, "package.json");
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

const nextDevPort = (appsDir: string | undefined): number => {
  if (!appsDir) {
    return 3000;
  }
  const used = collectUsedPorts(appsDir);
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
 * - Inside a Latch monorepo  → `<root>/apps/<slug>`.
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
    const targetDir = join(monorepoRoot, "apps", slug);
    return {
      slug,
      targetDir,
      label: `apps/${slug}`,
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

/** Copy + token-substitute the golden template into the resolved target. */
export const scaffoldApp = (target: ScaffoldTarget): { port: string } => {
  if (!existsSync(TEMPLATE_DIR)) {
    throw new Error(`Template not found: ${TEMPLATE_DIR}`);
  }
  assertWritable(target);

  const appsDir = target.monorepoRoot
    ? join(target.monorepoRoot, "apps")
    : undefined;
  const port = String(nextDevPort(appsDir));

  mkdirSync(target.targetDir, { recursive: true });
  cpSync(TEMPLATE_DIR, target.targetDir, { recursive: true });

  walkAndSubstitute(target.targetDir, {
    __APP_SLUG__: target.slug,
    __APP_PACKAGE__: toPackageName(target.slug),
    __APP_TITLE__: toTitle(target.slug),
    __APP_PORT__: port,
    __APP_REGISTRY__: `${toCamelCase(target.slug)}Registry`,
  });

  return { port };
};

export { toPackageName };
