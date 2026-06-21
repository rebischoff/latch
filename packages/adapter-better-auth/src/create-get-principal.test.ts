import { afterEach, describe, expect, it, vi } from "vitest";

import { createGetPrincipal } from "./create-get-principal";
import type { Principal } from "@latch/contracts";
import { Pool } from "pg";

describe("createGetPrincipal", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns DB-backed Principal for a provider session", async () => {
    const dbPrincipal: Principal = {
      id: "seed-tech",
      bindings: [{ roleId: "field_tech", scopeId: null }],
      roleClasses: { field_tech: "app" },
      policyVersion: 2,
    };

    const getPrincipal = createGetPrincipal({
      readSession: async () => ({
        userId: "better-auth-subject",
        label: "tech@demo.local",
        email: "tech@demo.local",
      }),
      pool: new Pool({ connectionString: "postgres://test" }),
      resolveUserId: async () => "seed-tech",
      loadPrincipal: async () => dbPrincipal,
    });

    await expect(getPrincipal()).resolves.toEqual(dbPrincipal);
  });

  it("loads LATCH_STUB_USER from DB when the user row exists", async () => {
    const dbPrincipal: Principal = {
      id: "seed-field-tech",
      bindings: [
        {
          roleId: "f0000001-0000-4000-8000-000000000001",
          scopeId: null,
        },
      ],
      roleClasses: {
        "f0000001-0000-4000-8000-000000000001": "app",
      },
    };

    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ exists: true }] });
    const pool = { query } as unknown as Pool;

    vi.stubEnv("LATCH_STUB_USER", "seed-field-tech");

    const getPrincipal = createGetPrincipal({
      readSession: async () => null,
      pool,
      loadPrincipal: async () => dbPrincipal,
    });

    await expect(getPrincipal()).resolves.toEqual(dbPrincipal);
    expect(query).toHaveBeenCalledWith(
      "SELECT EXISTS (SELECT 1 FROM latch_users WHERE id = $1) AS exists",
      ["seed-field-tech"],
    );
  });

  it("uses LATCH_STUB_* when no session (roles from env, not cookie)", async () => {
    vi.stubEnv("LATCH_STUB_USER", "stub-user");
    vi.stubEnv("LATCH_STUB_ROLE", "field_tech");

    const getPrincipal = createGetPrincipal({
      readSession: async () => null,
    });

    await expect(getPrincipal()).resolves.toEqual({
      id: "stub-user",
      bindings: [{ roleId: "field_tech", scopeId: null }],
    });
  });

  it("throws when there is no session and no stub env", async () => {
    const getPrincipal = createGetPrincipal({
      readSession: async () => null,
    });

    await expect(getPrincipal()).rejects.toThrow("No session");
  });
});
