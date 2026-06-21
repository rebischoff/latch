import { describe, expect, it, vi } from "vitest";

import { bindPermissionSession, withPermissionDb } from "./permission-db";

describe("withPermissionDb", () => {
  it("issues session bind before work inside BEGIN/COMMIT", async () => {
    const order: string[] = [];
    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql === "BEGIN") {
          order.push("BEGIN");
        } else if (sql.includes("app.principal_id")) {
          order.push(`principal:${params?.[0]}`);
        } else if (sql.includes("app.company_id")) {
          order.push(`company:${params?.[0]}`);
        } else if (sql === "COMMIT") {
          order.push("COMMIT");
        } else if (sql === "ROLLBACK") {
          order.push("ROLLBACK");
        } else {
          order.push("work");
        }
        return { rows: [], rowCount: 0 };
      }),
      release: vi.fn(),
    };

    const pool = {
      connect: vi.fn(async () => client),
    };

    await withPermissionDb(
      pool as never,
      "user-alpha",
      async () => {
        order.push("fn");
        return "ok";
      },
      { companyId: "co-pilot" },
    );

    expect(order).toEqual([
      "BEGIN",
      "principal:user-alpha",
      "company:co-pilot",
      "fn",
      "COMMIT",
    ]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("ROLLBACK when work throws", async () => {
    const client = {
      query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn(async () => client) };

    await expect(
      withPermissionDb(pool as never, "user-beta", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
  });
});

describe("bindPermissionSession", () => {
  it("sets principal and default company", async () => {
    const calls: Array<[string, unknown[] | undefined]> = [];
    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        calls.push([sql, params]);
        return { rows: [], rowCount: 0 };
      }),
    };

    await bindPermissionSession(
      client as unknown as Parameters<typeof bindPermissionSession>[0],
      "actor-1",
    );

    expect(calls).toHaveLength(2);
    expect(calls[0]?.[1]).toEqual(["actor-1"]);
    expect(calls[1]?.[1]).toEqual(["default"]);
  });
});
