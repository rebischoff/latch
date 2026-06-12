import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * A Latch monorepo root is a `package.json` that declares a `packages/*`
 * workspace. Codegen and scaffold use this to distinguish in-repo tooling
 * from a standalone consumer app.
 */
const declaresPackagesWorkspace = (pkgPath: string): boolean => {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      workspaces?: string[] | { packages?: string[] };
    };
    const patterns = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : (pkg.workspaces?.packages ?? []);
    return patterns.some(
      (pattern) => pattern === "packages/*" || pattern === "packages/**",
    );
  } catch {
    return false;
  }
};

/**
 * Walk up from `startDir` looking for a Latch monorepo root.
 * Returns the directory path, or `null` when run as a standalone project.
 */
export const findMonorepoRoot = (startDir: string): string | null => {
  let dir = startDir;

  for (;;) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath) && declaresPackagesWorkspace(pkgPath)) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
};
