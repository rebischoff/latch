import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";

import { loadPrincipalFromDb } from "./request-policy.js";

describe("normalizePrincipalBindings (via loadPrincipalFromDb)", () => {
  it("never emits scoped bindings for system classes", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            role_id: "iam-id",
            scope_id: "scope-should-strip",
            role_class: "system_iam",
          },
          {
            role_id: "data-id",
            scope_id: "scope-should-strip",
            role_class: "system_data",
          },
          {
            role_id: "app-id",
            scope_id: "scope-keep",
            role_class: "app",
          },
        ],
      }),
    } as unknown as Pool;

    const principal = await loadPrincipalFromDb(pool, "user-1");

    expect(principal.bindings).toEqual([
      { roleId: "iam-id", scopeId: null },
      { roleId: "data-id", scopeId: null },
      { roleId: "app-id", scopeId: "scope-keep" },
    ]);
    expect(principal.roleClasses).toEqual({
      "iam-id": "system_iam",
      "data-id": "system_data",
      "app-id": "app",
    });
  });
});
