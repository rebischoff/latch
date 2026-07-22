import { NotFoundError, ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it } from "vitest";

import { createGeneralBucketPurchaseOrderTx } from "./create-general";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount?: number }>;

const createClient = (query: QueryFn): PoolClient =>
  ({ query } as unknown as PoolClient);

describe("createGeneralBucketPurchaseOrderTx", () => {
  let calls: Array<{ sql: string; params?: unknown[] }>;

  beforeEach(() => {
    calls = [];
  });

  it("inserts a PO with job_id NULL (RP9)", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM party p")) {
        return { rows: [{ id: "vendor-1" }] };
      }
      return { rows: [], rowCount: 1 };
    });

    const result = await createGeneralBucketPurchaseOrderTx(client, {
      vendorPartyId: "vendor-1",
    });

    expect(result.id).toBeTruthy();
    const insert = calls.find((c) =>
      c.sql.includes("INSERT INTO purchase_order"),
    );
    expect(insert?.params?.[1]).toBe("vendor-1");
    expect(insert?.sql).toContain("NULL");
    // id, vendor, delivery_method, ship_to_note — job_id is SQL NULL literal
    expect(insert?.params).toHaveLength(4);
  });

  it("rejects an unknown vendor", async () => {
    const client = createClient(async () => ({ rows: [] }));
    await expect(
      createGeneralBucketPurchaseOrderTx(client, {
        vendorPartyId: "missing",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects an empty vendor id", async () => {
    const client = createClient(async () => ({ rows: [] }));
    await expect(
      createGeneralBucketPurchaseOrderTx(client, { vendorPartyId: "  " }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
