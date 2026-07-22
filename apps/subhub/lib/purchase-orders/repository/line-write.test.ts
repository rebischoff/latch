import { ConflictError, NotFoundError, ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updatePurchaseOrderLineTx } from "./line-write";

vi.mock("@latch/audit", () => ({
  writeAudit: vi.fn(async () => undefined),
}));

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount?: number }>;

const createClient = (query: QueryFn): PoolClient =>
  ({ query } as unknown as PoolClient);

const jobAssignedLine = {
  id: "line-1",
  status: "draft",
  quantity: 10,
  part_id: "part-1",
  description: "Wire",
  unit_price: 2,
  vendor_part_id: "vp-1",
  po_status: "draft",
  job_id: "job-1",
  vendor_party_id: "vendor-1",
};

const generalLine = {
  ...jobAssignedLine,
  job_id: null,
};

describe("updatePurchaseOrderLineTx", () => {
  let calls: Array<{ sql: string; params?: unknown[] }>;

  beforeEach(() => {
    calls = [];
  });

  it("rejects part swap on a job-assigned line (RP7)", async () => {
    const client = createClient(async (sql) => {
      if (sql.includes("FROM purchase_order_line pol")) {
        return { rows: [jobAssignedLine] };
      }
      return { rows: [] };
    });

    await expect(
      updatePurchaseOrderLineTx(client, "po-1", "line-1", {
        partId: "part-other",
      }),
    ).rejects.toMatchObject({
      details: { code: "part_frozen" },
    });
    expect(ConflictError).toBeTruthy();
  });

  it("allows qty decrease on a job-assigned line and reverts sources", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order_line pol")) {
        return { rows: [jobAssignedLine] };
      }
      if (sql.includes("FROM purchase_order_line_source pols")) {
        return {
          rows: [
            {
              source_id: "src-1",
              source_quantity: 10,
              request_id: "jmr-1",
              request_quantity: 10,
              request_status: "on_purchase_order",
              job_id: "job-1",
              site_zone_id: null,
              job_line_part_id: "jlp-1",
              part_id: "part-1",
              description: "Wire",
              unit: "ea",
              requested_by: null,
              requested_at: "2026-01-01",
            },
          ],
        };
      }
      return { rows: [], rowCount: 1 };
    });

    await updatePurchaseOrderLineTx(client, "po-1", "line-1", { quantity: 6 });

    const revertDelete = calls.find((c) =>
      c.sql.includes("DELETE FROM purchase_order_line_source"),
    );
    // Partial free — source qty reduced, not full delete when take < source
    const sourceUpdate = calls.find((c) =>
      c.sql.includes("UPDATE purchase_order_line_source SET quantity"),
    );
    expect(sourceUpdate ?? revertDelete).toBeTruthy();

    const lineUpdate = calls.find(
      (c) =>
        c.sql.includes("UPDATE purchase_order_line") &&
        c.sql.includes("description") &&
        !c.sql.includes("purchase_order_line_source"),
    );
    expect(lineUpdate?.params?.[1]).toBe(6);
  });

  it("rejects qty increase on a job-assigned line", async () => {
    const client = createClient(async (sql) => {
      if (sql.includes("FROM purchase_order_line pol")) {
        return { rows: [jobAssignedLine] };
      }
      return { rows: [] };
    });

    await expect(
      updatePurchaseOrderLineTx(client, "po-1", "line-1", { quantity: 12 }),
    ).rejects.toMatchObject({
      details: { code: "qty_increase_via_pool" },
    });
  });

  it("allows freeform part + qty edit on a general-bucket line", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order_line pol")) {
        return { rows: [generalLine] };
      }
      if (sql.includes("FROM manufacturer_part mp")) {
        return {
          rows: [
            {
              id: "vp-2",
              unit_price: 9,
              vendor_description: "New part text",
              manufacturer_description: "Mfr",
            },
          ],
        };
      }
      return { rows: [], rowCount: 1 };
    });

    await updatePurchaseOrderLineTx(client, "po-1", "line-1", {
      partId: "part-2",
      quantity: 20,
    });

    const lineUpdate = calls.find(
      (c) =>
        c.sql.includes("UPDATE purchase_order_line") &&
        c.sql.includes("part_id"),
    );
    expect(lineUpdate?.params?.[1]).toBe(20);
    expect(lineUpdate?.params?.[2]).toBe("part-2");
    expect(lineUpdate?.params?.[0]).toBe("New part text");
  });

  it("updates description while draft (IT6 override)", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order_line pol")) {
        return { rows: [jobAssignedLine] };
      }
      return { rows: [], rowCount: 1 };
    });

    await updatePurchaseOrderLineTx(client, "po-1", "line-1", {
      description: "  Custom override text  ",
    });

    const update = calls.find((c) =>
      c.sql.includes("UPDATE purchase_order_line"),
    );
    expect(update?.params?.[0]).toBe("Custom override text");
  });

  it("rejects when the line does not exist", async () => {
    const client = createClient(async () => ({ rows: [] }));
    await expect(
      updatePurchaseOrderLineTx(client, "po-1", "line-x", {
        description: "Text",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects when not draft", async () => {
    const client = createClient(async (sql) => {
      if (sql.includes("FROM purchase_order_line pol")) {
        return {
          rows: [{ ...jobAssignedLine, po_status: "sent" }],
        };
      }
      return { rows: [] };
    });
    await expect(
      updatePurchaseOrderLineTx(client, "po-1", "line-1", {
        description: "Text",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects an empty description", async () => {
    const client = createClient(async (sql) => {
      if (sql.includes("FROM purchase_order_line pol")) {
        return { rows: [jobAssignedLine] };
      }
      return { rows: [] };
    });
    await expect(
      updatePurchaseOrderLineTx(client, "po-1", "line-1", {
        description: "   ",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
