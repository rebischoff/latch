import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * A Latch monorepo root is a `package.json` that declares an `apps/*`
 * workspace. This is the signal that scaffolding and codegen should operate
 * across `apps/`, rather than treating the current directory as a single app.
 */
const declaresAppsWorkspace = (pkgPath: string): boolean => {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      workspaces?: string[] | { packages?: string[] };
    };
    const patterns = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : (pkg.workspaces?.packages ?? []);
    return patterns.some(
      (pattern) => pattern === "apps/*" || pattern === "apps/**",
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
    if (existsSync(pkgPath) && declaresAppsWorkspace(pkgPath)) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
};
