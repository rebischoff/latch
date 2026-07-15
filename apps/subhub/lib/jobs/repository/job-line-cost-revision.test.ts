import { ConflictError, ValidationError } from "@latch/contracts";
import { describe, expect, it, vi } from "vitest";

import { reviseJobLineCostTx } from "./job-line-cost-revision";

const mockClient = (handlers: {
  selectLine?: { id: string; unit_cost: number; status: string } | null;
}) => {
  const query = vi.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes("FROM job_line WHERE id") && sql.includes("FOR UPDATE")) {
      const row = handlers.selectLine;
      return { rows: row ? [row] : [] };
    }
    if (sql.startsWith("INSERT INTO job_line_cost_revision")) {
      return { rows: [] };
    }
    if (sql.startsWith("UPDATE job_line SET unit_cost")) {
      return { rows: [] };
    }
    if (sql.includes("FROM job_line_cost_revision WHERE id")) {
      return {
        rows: [
          {
            id: params?.[0] ?? "rev-1",
            job_line_id: "line-1",
            previous_unit_cost: 100,
            new_unit_cost: 125,
            reason: "vendor price up",
            revised_by: "actor-1",
            revised_at: new Date("2026-07-14T12:00:00.000Z"),
          },
        ],
      };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });

  return { query } as never;
};

describe("reviseJobLineCostTx", () => {
  it("rejects empty reason", async () => {
    const client = mockClient({
      selectLine: { id: "line-1", unit_cost: 100, status: "active" },
    });

    await expect(
      reviseJobLineCostTx(client, "actor-1", {
        job_line_id: "line-1",
        new_unit_cost: 125,
        reason: "   ",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects unknown job line", async () => {
    const client = mockClient({ selectLine: null });

    await expect(
      reviseJobLineCostTx(client, "actor-1", {
        job_line_id: "missing",
        new_unit_cost: 125,
        reason: "vendor price up",
      }),
    ).rejects.toMatchObject({
      details: { code: "unknown_job_line" },
    });
  });

  it("rejects non-active job line", async () => {
    const client = mockClient({
      selectLine: { id: "line-1", unit_cost: 100, status: "voided" },
    });

    await expect(
      reviseJobLineCostTx(client, "actor-1", {
        job_line_id: "line-1",
        new_unit_cost: 125,
        reason: "vendor price up",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("inserts revision then updates unit_cost", async () => {
    const client = mockClient({
      selectLine: { id: "line-1", unit_cost: 100, status: "active" },
    });

    const result = await reviseJobLineCostTx(client, "actor-1", {
      job_line_id: "line-1",
      new_unit_cost: 125,
      reason: "vendor price up",
    });

    expect(result).toMatchObject({
      job_line_id: "line-1",
      previous_unit_cost: 100,
      new_unit_cost: 125,
      reason: "vendor price up",
      revised_by: "actor-1",
    });

    const sqlCalls = (client as { query: ReturnType<typeof vi.fn> }).query.mock
      .calls as Array<[string, unknown[]?]>;
    expect(sqlCalls.some(([sql]) => sql.startsWith("INSERT INTO job_line_cost_revision"))).toBe(
      true,
    );
    expect(
      sqlCalls.some(
        ([sql, params]) =>
          sql.startsWith("UPDATE job_line SET unit_cost") &&
          params?.[0] === 125 &&
          params?.[1] === "line-1",
      ),
    ).toBe(true);
  });
});
