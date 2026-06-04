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
      "@latch/audit": latchAlias("audit"),
      "@latch/approval": latchAlias("approval"),
      "@latch/react": latchAlias("react"),
      "@latch/codegen": latchAlias("codegen"),
      "@latch/crm/test-utils": path.join(root, "apps/crm/test-utils/index.ts"),
      "@": path.join(root, "apps/crm/src"),
    },
  },
  test: {
    include: [
      "packages/**/*.test.ts",
      "apps/crm/**/*.test.ts",
      "apps/test1/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    /** Tests that spy on `PolicyService.resolve` expect no cache unless opted in. */
    env: {
      LATCH_MANIFEST_CACHE_MODE: "none",
    },
  },
});
