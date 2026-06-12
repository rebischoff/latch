import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();

vi.mock("@latch/pg-session", () => ({
  withPermissionDb: vi.fn(async (_pool, principalId, fn) => {
    expect(principalId).toBe("seed-tech");
    return fn({ query: mockQuery });
  }),
}));

import { loadPrincipalFromDb } from "./load-principal-from-db.js";
import { Pool } from "pg";

describe("loadPrincipalFromDb", () => {
  const pool = new Pool({ connectionString: "postgres://test" });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("loads scoped bindings and roleClasses from latch_user_roles, not session", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            role_id: "role-app-1",
            role_class: "app",
            scope_id: "scope-a",
          },
          {
            role_id: "role-system-data",
            role_class: "system_data",
            scope_id: "scope-b",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ version: "3" }] });

    await expect(loadPrincipalFromDb(pool, "seed-tech")).resolves.toEqual({
      id: "seed-tech",
      bindings: [
        { roleId: "role-app-1", scopeId: "scope-a" },
        { roleId: "role-system-data", scopeId: null },
      ],
      roleClasses: {
        "role-app-1": "app",
        "role-system-data": "system_data",
      },
      policyVersion: 3,
    });
  });
});
