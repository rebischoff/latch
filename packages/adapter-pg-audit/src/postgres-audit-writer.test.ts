import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn(async () => ({ rows: [], rowCount: 1 }));
let capturedPrincipal: string | undefined;

vi.mock("@latch/pg-session", () => ({
  withPermissionDb: vi.fn(async (_pool, principalId, fn) => {
    capturedPrincipal = principalId;
    return fn({ query: mockQuery });
  }),
}));

const mockEnd = vi.fn(async () => undefined);

vi.mock("pg", () => ({
  Pool: vi.fn(() => ({ end: mockEnd })),
}));

import { withPermissionDb } from "@latch/pg-session";

import { createPostgresAuditWriter } from "./postgres-audit-writer.js";

describe("createPostgresAuditWriter", () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockEnd.mockClear();
    capturedPrincipal = undefined;
    vi.mocked(withPermissionDb).mockClear();
  });

  it("wraps INSERT in withPermissionDb bound to entry.actorId", async () => {
    const { writer } = createPostgresAuditWriter("postgres://test");

    await writer({
      actorId: "actor-xyz",
      action: "update",
      tableName: "jobs",
      recordId: "job-1",
    });

    expect(withPermissionDb).toHaveBeenCalledOnce();
    expect(capturedPrincipal).toBe("actor-xyz");
  });

  it("INSERT maps AuditEntryInput to canonical latch_audit columns", async () => {
    const { writer } = createPostgresAuditWriter("postgres://test");

    await writer({
      actorId: "actor-1",
      action: "insert",
      tableName: "customers",
      recordId: "cust-42",
      moduleId: "customer_detail",
      fieldIds: ["name", "email"],
      before: { name: "Old" },
      after: { name: "New" },
      patch: { name: "New" },
      requestId: "req-9",
      approvalId: "appr-3",
    });

    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0] as unknown as [
      string,
      unknown[],
    ];

    expect(sql).toContain("INSERT INTO latch_audit");
    expect(sql).toContain("actor_id");
    expect(sql).toContain("entity_type");
    expect(sql).toContain("entity_id");
    expect(params).toEqual([
      "actor-1",
      "insert",
      "customer_detail",
      "customers",
      "cust-42",
      ["name", "email"],
      { name: "Old" },
      { name: "New" },
      { name: "New" },
      "req-9",
      "appr-3",
    ]);
  });

  it("close drains the pool", async () => {
    const { close } = createPostgresAuditWriter("postgres://test");
    await close();
    expect(mockEnd).toHaveBeenCalledOnce();
  });
});
