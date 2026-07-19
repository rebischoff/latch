import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it } from "vitest";

import { attachSourceTx } from "./source-links";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount?: number }>;

const createClient = (query: QueryFn): PoolClient =>
  ({ query } as unknown as PoolClient);

describe("attachSourceTx", () => {
  let calls: Array<{ sql: string; params?: unknown[] }>;

  beforeEach(() => {
    calls = [];
  });

  it("rejects when source qty sum does not match line quantity", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order_line")) {
        return { rows: [{ quantity: 10 }] };
      }
      return { rows: [] };
    });

    await expect(
      attachSourceTx(client, "pol-1", [
        { jobMaterialRequestId: "jmr-1", quantity: 4 },
        { jobMaterialRequestId: "jmr-2", quantity: 5 },
      ]),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("inserts multiple sources and flips request status on attach", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order_line")) {
        return { rows: [{ quantity: 10 }] };
      }
      if (sql.includes("FROM job_material_request")) {
        return {
          rows: [
            { id: "jmr-1", status: "open" },
            { id: "jmr-2", status: "open" },
          ],
        };
      }
      return { rows: [], rowCount: 1 };
    });

    await attachSourceTx(client, "pol-1", [
      { jobMaterialRequestId: "jmr-1", quantity: 6 },
      { jobMaterialRequestId: "jmr-2", quantity: 4 },
    ]);

    const inserts = calls.filter((c) =>
      c.sql.includes("INSERT INTO purchase_order_line_source"),
    );
    expect(inserts).toHaveLength(2);
    expect(inserts[0]?.params?.[2]).toBe("jmr-1");
    expect(inserts[0]?.params?.[3]).toBe(6);
    expect(inserts[1]?.params?.[2]).toBe("jmr-2");
    expect(inserts[1]?.params?.[3]).toBe(4);

    const statusUpdate = calls.find((c) =>
      c.sql.includes("SET status = 'on_purchase_order'"),
    );
    expect(statusUpdate?.params?.[0]).toEqual(["jmr-1", "jmr-2"]);
  });

  it("rejects an empty sources array", async () => {
    const client = createClient(async () => ({ rows: [] }));
    await expect(attachSourceTx(client, "pol-1", [])).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
