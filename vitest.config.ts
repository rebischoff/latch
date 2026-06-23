import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

const latchAlias = (pkg: string) =>
  path.join(root, "packages", pkg, "src", "index.ts");

export default defineConfig({
  resolve: {
    alias: {
      "@latch/contracts": latchAlias("contracts"),
      "@latch/policy": latchAlias("policy"),
      "@latch/dal": latchAlias("dal"),
      "@latch/adapter-better-auth": latchAlias("adapter-better-auth"),
      "@latch/adapter-neon": latchAlias("adapter-neon"),
      "@latch/adapter-pg-audit": latchAlias("adapter-pg-audit"),
      "@latch/audit": latchAlias("audit"),
      "@latch/pg-session": latchAlias("pg-session"),
      "@latch/approval": latchAlias("approval"),
      "@latch/react": latchAlias("react"),
      "@latch/codegen": latchAlias("codegen"),
      "@latch/app-kit": latchAlias("app-kit"),
      "@latch/adapter-pg-store": latchAlias("adapter-pg-store"),
      "@": path.join(root, "apps/subhub"),
    },
  },
  test: {
    include: [
      "packages/**/*.test.ts",
      "fixtures/**/*.test.ts",
      "apps/subhub/**/*.test.ts",
    ],
    /** Tests that spy on `PolicyService.resolve` expect no cache unless opted in. */
    env: {
      LATCH_MANIFEST_CACHE_MODE: "none",
    },
  },
});
