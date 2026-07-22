import { ConflictError, NotFoundError, ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { addAdHocPurchaseOrderLineTx } from "./adhoc-line";

vi.mock("@latch/audit", () => ({
  writeAudit: vi.fn(async () => undefined),
}));

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount?: number }>;

const createClient = (query: QueryFn): PoolClient =>
  ({ query } as unknown as PoolClient);

describe("addAdHocPurchaseOrderLineTx", () => {
  let calls: Array<{ sql: string; params?: unknown[] }>;

  beforeEach(() => {
    calls = [];
  });

  it("rejects direct add on a job-assigned PO (RP8)", async () => {
    const client = createClient(async (sql) => {
      if (sql.includes("FROM purchase_order WHERE id")) {
        return {
          rows: [
            {
              id: "po-1",
              job_id: "job-1",
              vendor_party_id: "vendor-1",
              status: "draft",
            },
          ],
        };
      }
      return { rows: [] };
    });

    await expect(
      addAdHocPurchaseOrderLineTx(client, "po-1", {
        description: "Extra fittings",
        quantity: 4,
      }),
    ).rejects.toMatchObject({
      details: { code: "job_assigned_po_no_direct_lines" },
    });
  });

  it("adds a freeform line on a general-bucket PO with no JMR (RP10)", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order WHERE id")) {
        return {
          rows: [
            {
              id: "po-1",
              job_id: null,
              vendor_party_id: "vendor-1",
              status: "draft",
            },
          ],
        };
      }
      if (sql.includes("MAX(line_number)")) {
        return { rows: [{ max: 2 }] };
      }
      return { rows: [], rowCount: 1 };
    });

    const result = await addAdHocPurchaseOrderLineTx(client, "po-1", {
      description: "Shop stock screws",
      quantity: 4,
    });

    expect(result.purchaseOrderLineId).toBeTruthy();

    const jmrInsert = calls.find((c) =>
      c.sql.includes("INSERT INTO job_material_request"),
    );
    expect(jmrInsert).toBeUndefined();

    const sourceInsert = calls.find((c) =>
      c.sql.includes("INSERT INTO purchase_order_line_source"),
    );
    expect(sourceInsert).toBeUndefined();

    const lineInsert = calls.find((c) =>
      c.sql.includes("INSERT INTO purchase_order_line ("),
    );
    expect(lineInsert?.params?.[3]).toBe("Shop stock screws");
    expect(lineInsert?.params?.[4]).toBe(4);
    expect(lineInsert?.sql).toContain("NULL, NULL, 'draft'");
  });

  it("requires description and/or part", async () => {
    const client = createClient(async () => ({ rows: [] }));
    await expect(
      addAdHocPurchaseOrderLineTx(client, "po-1", { quantity: 1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects when the PO is not draft", async () => {
    const client = createClient(async (sql) => {
      if (sql.includes("FROM purchase_order WHERE id")) {
        return {
          rows: [
            {
              id: "po-1",
              job_id: null,
              vendor_party_id: "vendor-1",
              status: "sent",
            },
          ],
        };
      }
      return { rows: [] };
    });

    await expect(
      addAdHocPurchaseOrderLineTx(client, "po-1", {
        description: "Late",
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects when the PO is missing", async () => {
    const client = createClient(async () => ({ rows: [] }));
    await expect(
      addAdHocPurchaseOrderLineTx(client, "po-x", {
        description: "Nope",
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("seeds description from vendor/manufacturer over request text (IT6)", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM purchase_order WHERE id")) {
        return {
          rows: [
            {
              id: "po-1",
              job_id: null,
              vendor_party_id: "vendor-1",
              status: "draft",
            },
          ],
        };
      }
      if (sql.includes("FROM manufacturer_part mp")) {
        return {
          rows: [
            {
              id: "vp-1",
              unit_price: 5,
              vendor_description: "Vendor-preferred text",
              manufacturer_description: "Mfr text",
            },
          ],
        };
      }
      if (sql.includes("MAX(line_number)")) {
        return { rows: [{ max: 0 }] };
      }
      return { rows: [], rowCount: 1 };
    });

    await addAdHocPurchaseOrderLineTx(client, "po-1", {
      description: "Request text",
      partId: "part-1",
      quantity: 1,
    });

    const lineInsert = calls.find((c) =>
      c.sql.includes("INSERT INTO purchase_order_line ("),
    );
    expect(lineInsert?.params?.[3]).toBe("Vendor-preferred text");
  });
});
