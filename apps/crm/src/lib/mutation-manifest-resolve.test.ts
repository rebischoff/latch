import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const crmRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Server mutation entrypoints must not authorize writes from the read manifest cache. */
const MUTATION_SOURCES: { path: string; mustContain: string }[] = [
  { path: "src/app/actions/job-detail.ts", mustContain: "resolveContextFresh" },
  { path: "src/app/actions/customer-detail.ts", mustContain: "resolveContextFresh" },
  {
    path: "src/app/api/customers/[id]/route.ts",
    mustContain: "resolveContextFresh",
  },
  {
    path: "src/app/api/iam/users/[id]/route.ts",
    mustContain: "resolveContextFresh",
  },
  { path: "src/lib/pending-api.ts", mustContain: "bypassCache: true" },
];

describe("mutation paths bypass manifest read cache", () => {
  for (const { path, mustContain } of MUTATION_SOURCES) {
    it(path, () => {
      const src = readFileSync(join(crmRoot, path), "utf8");
      expect(src).toContain(mustContain);
    });
  }
});
