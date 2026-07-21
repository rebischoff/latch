import { ConflictError, NotFoundError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deletePurchaseOrderTx } from "./delete";

vi.mock("./revert-sources", () => ({
  revertAllPendingSourcesTx: vi.fn(async () => ["jmr-1"]),
}));

import { revertAllPendingSourcesTx } from "./revert-sources";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount?: number }>;

const createClient = (query: QueryFn): PoolClient =>
  ({ query } as unknown as PoolClient);

describe("deletePurchaseOrderTx", () => {
  beforeEach(() => {
    vi.mocked(revertAllPendingSourcesTx).mockClear();
  });

  it("reverts pending sources on each line then deletes the draft header", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order WHERE id")) {
        return { rows: [{ id: "po-1", status: "draft" }] };
      }
      if (sql.includes("FROM purchase_order_line")) {
        return { rows: [{ id: "pol-1" }, { id: "pol-2" }] };
      }
      return { rows: [], rowCount: 1 };
    });

    await deletePurchaseOrderTx(client, "actor-1", "po-1");

    expect(revertAllPendingSourcesTx).toHaveBeenCalledTimes(2);
    expect(revertAllPendingSourcesTx).toHaveBeenNthCalledWith(
      1,
      client,
      "pol-1",
    );
    expect(revertAllPendingSourcesTx).toHaveBeenNthCalledWith(
      2,
      client,
      "pol-2",
    );

    const headerDelete = calls.find(
      (c) =>
        c.sql.includes("DELETE FROM purchase_order") &&
        c.params?.[0] === "po-1",
    );
    expect(headerDelete).toBeTruthy();
  });

  it("rejects non-draft purchase orders", async () => {
    const client = createClient(async (sql) => {
      if (sql.includes("FROM purchase_order WHERE id")) {
        return { rows: [{ id: "po-1", status: "sent" }] };
      }
      return { rows: [] };
    });

    await expect(
      deletePurchaseOrderTx(client, "actor-1", "po-1"),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(revertAllPendingSourcesTx).not.toHaveBeenCalled();
  });

  it("deletes a draft with no lines", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order WHERE id")) {
        return { rows: [{ id: "po-1", status: "draft" }] };
      }
      if (sql.includes("FROM purchase_order_line")) {
        return { rows: [] };
      }
      return { rows: [], rowCount: 1 };
    });

    await deletePurchaseOrderTx(client, "actor-1", "po-1");

    expect(revertAllPendingSourcesTx).not.toHaveBeenCalled();
    const headerDelete = calls.find((c) =>
      c.sql.includes("DELETE FROM purchase_order"),
    );
    expect(headerDelete?.params?.[0]).toBe("po-1");
  });

  it("throws NotFoundError when the purchase order is missing", async () => {
    const client = createClient(async () => ({ rows: [] }));

    await expect(
      deletePurchaseOrderTx(client, "actor-1", "po-missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
