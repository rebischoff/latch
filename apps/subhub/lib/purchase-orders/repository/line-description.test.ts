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

describe("updatePurchaseOrderLineDescriptionTx", () => {
  let calls: Array<{ sql: string; params?: unknown[] }>;

  beforeEach(() => {
    calls = [];
  });

  it("updates the description while draft (IT6 override)", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order_line pol")) {
        return { rows: [{ id: "line-1", status: "draft", po_status: "draft" }] };
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
      c.sql.includes("UPDATE purchase_order_line SET description"),
    );
    expect(update?.params).toEqual(["Custom override text", "line-1"]);
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
        return { rows: [{ id: "line-1", status: "draft", po_status: "sent" }] };
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
        return {
          rows: [{ id: "line-1", status: "cancelled", po_status: "draft" }],
        };
      }
      return { rows: [] };
    });
    await expect(
      updatePurchaseOrderLineDescriptionTx(client, "po-1", "line-1", "Text"),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects an empty description", async () => {
    const client = createClient(async () => ({ rows: [] }));
    await expect(
      updatePurchaseOrderLineDescriptionTx(client, "po-1", "line-1", "   "),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
