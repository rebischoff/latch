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
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
