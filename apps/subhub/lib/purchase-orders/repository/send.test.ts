import { ConflictError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it } from "vitest";

import { sendPurchaseOrderTx } from "./send";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount?: number }>;

const createClient = (query: QueryFn): PoolClient =>
  ({ query } as unknown as PoolClient);

describe("sendPurchaseOrderTx", () => {
  let calls: Array<{ sql: string; params?: unknown[] }>;

  beforeEach(() => {
    calls = [];
  });

  it("stamps ordered_at, flips lines to ordered, and creates default shipments", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order WHERE id")) {
        return { rows: [{ id: "po-1", status: "draft", po_number: null }] };
      }
      if (sql.includes("FROM purchase_order_line") && sql.includes("status = 'draft'")) {
        return {
          rows: [
            { id: "pol-1", quantity: 5 },
            { id: "pol-2", quantity: 3 },
          ],
        };
      }
      if (sql.includes("FROM purchase_order") && sql.includes("po_number ~")) {
        return { rows: [{ po_number: "PO-1001" }] };
      }
      if (sql.includes("COUNT(*)") && sql.includes("purchase_order_line_shipment")) {
        return { rows: [{ count: 0 }] };
      }
      return { rows: [], rowCount: 1 };
    });

    await sendPurchaseOrderTx(client, "po-1");

    const headerUpdate = calls.find(
      (c) =>
        c.sql.includes("UPDATE purchase_order") && c.sql.includes("status = 'sent'"),
    );
    expect(headerUpdate?.params?.[1]).toBe("PO-1002");

    const lineUpdates = calls.filter(
      (c) =>
        c.sql.includes("UPDATE purchase_order_line") &&
        c.sql.includes("status = 'ordered'"),
    );
    expect(lineUpdates).toHaveLength(2);

    const shipments = calls.filter((c) =>
      c.sql.includes("INSERT INTO purchase_order_line_shipment"),
    );
    expect(shipments).toHaveLength(2);
    expect(shipments[0]?.params?.[2]).toBe(5);
    expect(shipments[1]?.params?.[2]).toBe(3);
  });

  it("rejects non-draft POs", async () => {
    const client = createClient(async (sql) => {
      if (sql.includes("FROM purchase_order WHERE id")) {
        return { rows: [{ id: "po-1", status: "sent", po_number: "PO-1" }] };
      }
      return { rows: [] };
    });

    await expect(sendPurchaseOrderTx(client, "po-1")).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});
