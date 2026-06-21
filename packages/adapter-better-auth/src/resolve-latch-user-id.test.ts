import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();

vi.mock("@latch/pg-session", () => ({
  withPermissionDb: vi.fn(async (_pool, _principalId, fn) =>
    fn({ query: mockQuery }),
  ),
}));

import { withPermissionDb } from "@latch/pg-session";
import { Pool } from "pg";

import { resolveLatchUserId } from "./resolve-latch-user-id";

describe("resolveLatchUserId", () => {
  const pool = new Pool({ connectionString: "postgres://test" });

  beforeEach(() => {
    mockQuery.mockReset();
    vi.mocked(withPermissionDb).mockClear();
  });

  it("returns latch_users.id when subject matches a row", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "seed-tech" }] });

    await expect(
      resolveLatchUserId(pool, { subject: "seed-tech" }),
    ).resolves.toBe("seed-tech");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("FROM latch_users WHERE id = $1"),
      ["seed-tech"],
    );
  });

  it("maps login email to latch_users.id when subject differs", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "seed-admin" }] });

    await expect(
      resolveLatchUserId(pool, {
        subject: "better-auth-uuid",
        email: "admin@demo.local",
      }),
    ).resolves.toBe("seed-admin");
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("login_name = $1 OR login_email = $1"),
      ["admin@demo.local"],
    );
  });

  it("maps login_name to latch_users.id when subject differs", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "seed-admin" }] });

    await expect(
      resolveLatchUserId(pool, {
        subject: "better-auth-uuid",
        email: "master",
      }),
    ).resolves.toBe("seed-admin");
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("login_name = $1 OR login_email = $1"),
      ["master"],
    );
  });

  it("maps @latch.local credential email back to login_name", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "seed-admin" }] });

    await expect(
      resolveLatchUserId(pool, {
        subject: "better-auth-uuid",
        email: "master@latch.local",
      }),
    ).resolves.toBe("seed-admin");
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("login_name = $1 OR login_email = $1"),
      ["master"],
    );
  });

  it("falls back to provider subject when no latch row matches", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      resolveLatchUserId(pool, {
        subject: "orphan-subject",
        email: "missing@demo.local",
      }),
    ).resolves.toBe("orphan-subject");
  });
});
