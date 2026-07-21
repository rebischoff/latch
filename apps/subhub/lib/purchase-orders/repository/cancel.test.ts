import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelPurchaseOrderLineTx,
  cancelPurchaseOrderShipmentTx,
  previewCancelWarningTx,
} from "./cancel";

vi.mock("@latch/audit", () => ({
  writeAudit: vi.fn(async () => undefined),
}));

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount?: number }>;

const createClient = (query: QueryFn): PoolClient =>
  ({ query } as unknown as PoolClient);

describe("cancel lifecycle", () => {
  let calls: Array<{ sql: string; params?: unknown[] }>;

  beforeEach(() => {
    calls = [];
  });

  it("reverts on_purchase_order sources to open and leaves fulfilled untouched", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (
        sql.includes("FROM purchase_order_line WHERE id") &&
        !sql.includes("purchase_order_line_source")
      ) {
        return {
          rows: [
            {
              id: "pol-1",
              purchase_order_id: "po-1",
              status: "ordered",
              quantity: 10,
            },
          ],
        };
      }
      if (sql.includes("FROM purchase_order_line_shipment")) {
        return {
          rows: [{ id: "ship-1", status: "scheduled", quantity: 10 }],
        };
      }
      if (sql.includes("SUM(pols.quantity)")) {
        return { rows: [{ quantity: 6 }] };
      }
      if (
        sql.includes("FROM purchase_order_line_source pols") &&
        sql.includes("on_purchase_order")
      ) {
        return {
          rows: [
            {
              source_id: "src-pending",
              source_quantity: 6,
              request_id: "jmr-pending",
              request_quantity: 6,
              request_status: "on_purchase_order",
              job_id: "job-1",
              site_zone_id: null,
              job_line_part_id: null,
              part_id: null,
              description: "x",
              unit: "ea",
              requested_by: null,
              requested_at: "2026-01-02",
            },
          ],
        };
      }
      return { rows: [], rowCount: 1 };
    });

    const opened = await cancelPurchaseOrderLineTx(client, "actor-1", "pol-1");
    expect(opened).toContain("jmr-pending");

    const deletes = calls.filter((c) =>
      c.sql.includes("DELETE FROM purchase_order_line_source"),
    );
    expect(deletes.length).toBeGreaterThan(0);

    const reopen = calls.find(
      (c) =>
        c.sql.includes("UPDATE job_material_request") &&
        c.sql.includes("status = 'open'"),
    );
    expect(reopen?.params?.[0]).toBe("jmr-pending");

    const lineCancel = calls.find(
      (c) =>
        c.sql.includes("UPDATE purchase_order_line") &&
        c.sql.includes("status = 'cancelled'"),
    );
    expect(lineCancel).toBeTruthy();
  });

  it("preview returns strong warning when a covering shipment is shipped", async () => {
    const client = createClient(async (sql) => {
      if (sql.includes("FROM purchase_order_line WHERE id")) {
        return { rows: [{ status: "ordered" }] };
      }
      if (sql.includes("FROM purchase_order_line_shipment")) {
        return { rows: [{ status: "shipped" }] };
      }
      return { rows: [] };
    });

    const level = await previewCancelWarningTx(client, "po-1", {
      level: "line",
      purchaseOrderLineId: "pol-1",
    });
    expect(level).toBe("strong");
  });

  it("shipment-level cancel frees only that shipment qty", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order_line_shipment WHERE id")) {
        return {
          rows: [
            {
              id: "ship-2",
              purchase_order_line_id: "pol-1",
              status: "scheduled",
              quantity: 10,
            },
          ],
        };
      }
      if (sql.includes("FROM purchase_order_line WHERE id")) {
        return {
          rows: [
            {
              id: "pol-1",
              purchase_order_id: "po-1",
              status: "ordered",
              quantity: 40,
            },
          ],
        };
      }
      if (
        sql.includes("FROM purchase_order_line_source pols") &&
        sql.includes("on_purchase_order")
      ) {
        return {
          rows: [
            {
              source_id: "src-late",
              source_quantity: 10,
              request_id: "jmr-late",
              request_quantity: 10,
              request_status: "on_purchase_order",
              job_id: "job-1",
              site_zone_id: null,
              job_line_part_id: null,
              part_id: null,
              description: "late",
              unit: "ea",
              requested_by: null,
              requested_at: "2026-02-01",
            },
          ],
        };
      }
      return { rows: [], rowCount: 1 };
    });

    const opened = await cancelPurchaseOrderShipmentTx(
      client,
      "actor-1",
      "ship-2",
    );
    expect(opened).toEqual(["jmr-late"]);

    const qtyUpdate = calls.find(
      (c) =>
        c.sql.includes("UPDATE purchase_order_line SET quantity") &&
        !c.sql.includes("status"),
    );
    expect(qtyUpdate?.params?.[0]).toBe(30);
  });
});
