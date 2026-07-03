import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  assertIncludesExcludesNoOverlap,
  assertRootSpecParticipationExcludes,
  assertSpecDefsBelongToRoot,
} from "./category-spec-participation-write";

describe("assertRootSpecParticipationExcludes", () => {
  it("allows includes-only patch on root", () => {
    expect(() => assertRootSpecParticipationExcludes(true, undefined)).not.toThrow();
  });

  it("rejects excludes on root category", () => {
    expect(() =>
      assertRootSpecParticipationExcludes(true, [{ spec_def_id: "def-1" }]),
    ).toThrow(ValidationError);
  });
});

describe("assertIncludesExcludesNoOverlap", () => {
  it("rejects the same spec_def_id in includes and excludes", () => {
    expect(() =>
      assertIncludesExcludesNoOverlap(
        [{ spec_def_id: "def-1" }],
        [{ spec_def_id: "def-1" }],
      ),
    ).toThrow(ValidationError);
  });
});

describe("assertSpecDefsBelongToRoot", () => {
  it("allows spec defs under the ancestor root", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        rows: [{ id: "def-1" }, { id: "def-2" }],
      }),
    } as unknown as PoolClient;

    await expect(
      assertSpecDefsBelongToRoot(client, "root-a", ["def-1", "def-2"]),
    ).resolves.toBeUndefined();
  });
});
