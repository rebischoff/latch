import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it } from "vitest";

import { splitPurchaseOrderLineShipmentTx } from "./shipment-split";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount?: number }>;

const createClient = (query: QueryFn): PoolClient =>
  ({ query } as unknown as PoolClient);

describe("splitPurchaseOrderLineShipmentTx", () => {
  let calls: Array<{ sql: string; params?: unknown[] }>;

  beforeEach(() => {
    calls = [];
  });

  it("splits a scheduled shipment into near + backorder rows", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order_line WHERE id")) {
        return { rows: [{ id: "pol-1", status: "ordered", quantity: 40 }] };
      }
      if (sql.includes("FROM purchase_order_line_shipment")) {
        return {
          rows: [
            {
              id: "ship-1",
              shipment_number: 1,
              quantity: 40,
              status: "scheduled",
              eta_date: null,
            },
          ],
        };
      }
      return { rows: [], rowCount: 1 };
    });

    const result = await splitPurchaseOrderLineShipmentTx(client, "pol-1", {
      nearQuantity: 30,
      nearEtaDate: "2026-08-01",
    });

    expect(result.nearShipmentId).toBe("ship-1");
    expect(result.backorderShipmentId).toBeTruthy();

    const nearUpdate = calls.find(
      (c) =>
        c.sql.includes("UPDATE purchase_order_line_shipment") &&
        c.sql.includes("quantity"),
    );
    expect(nearUpdate?.params?.[0]).toBe(30);

    const insert = calls.find((c) =>
      c.sql.includes("INSERT INTO purchase_order_line_shipment"),
    );
    expect(insert?.params?.[3]).toBe(10);
  });
});
