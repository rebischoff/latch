import { ConflictError, NotFoundError, ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it } from "vitest";

import { updatePurchaseOrderLineDescriptionTx } from "./line-description";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount?: number }>;

const createClient = (query: QueryFn): PoolClient =>
  ({ query } as unknown as PoolClient);

const draftLine = {
  id: "line-1",
  status: "draft",
  quantity: 1,
  part_id: "part-1",
  description: "Wire",
  unit_price: 1,
  vendor_part_id: null,
  po_status: "draft",
  job_id: "job-1",
  vendor_party_id: "vendor-1",
};

describe("updatePurchaseOrderLineDescriptionTx", () => {
  let calls: Array<{ sql: string; params?: unknown[] }>;

  beforeEach(() => {
    calls = [];
  });

  it("updates the description while draft (IT6 override)", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order_line pol")) {
        return { rows: [draftLine] };
      }
      return { rows: [], rowCount: 1 };
    });

    await updatePurchaseOrderLineDescriptionTx(
      client,
      "po-1",
      "line-1",
      "  Custom override text  ",
    );

    const update = calls.find((c) =>
      c.sql.includes("UPDATE purchase_order_line"),
    );
    expect(update?.params?.[0]).toBe("Custom override text");
  });

  it("rejects when the line does not exist", async () => {
    const client = createClient(async () => ({ rows: [] }));
    await expect(
      updatePurchaseOrderLineDescriptionTx(client, "po-1", "line-x", "Text"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects when the purchase order is not draft", async () => {
    const client = createClient(async (sql) => {
      if (sql.includes("FROM purchase_order_line pol")) {
        return { rows: [{ ...draftLine, po_status: "sent" }] };
      }
      return { rows: [] };
    });
    await expect(
      updatePurchaseOrderLineDescriptionTx(client, "po-1", "line-1", "Text"),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects when the line itself is not draft", async () => {
    const client = createClient(async (sql) => {
      if (sql.includes("FROM purchase_order_line pol")) {
        return { rows: [{ ...draftLine, status: "cancelled" }] };
      }
      return { rows: [] };
    });
    await expect(
      updatePurchaseOrderLineDescriptionTx(client, "po-1", "line-1", "Text"),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects an empty description", async () => {
    const client = createClient(async (sql) => {
      if (sql.includes("FROM purchase_order_line pol")) {
        return { rows: [draftLine] };
      }
      return { rows: [] };
    });
    await expect(
      updatePurchaseOrderLineDescriptionTx(client, "po-1", "line-1", "   "),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
