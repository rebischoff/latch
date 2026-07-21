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

  it("creates backing request in General when no zone is picked", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
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
      if (sql.includes("MAX(line_number)")) {
        return { rows: [{ max: 2 }] };
      }
      if (sql.includes("FROM purchase_order_line WHERE id")) {
        return { rows: [{ quantity: 4 }] };
      }
      if (sql.includes("FROM job_material_request WHERE id = ANY")) {
        const ids = (params?.[0] as string[] | undefined) ?? [];
        return {
          rows: ids.map((id) => ({ id, status: "on_purchase_order" })),
        };
      }
      return { rows: [], rowCount: 1 };
    });

    const result = await addAdHocPurchaseOrderLineTx(client, "po-1", {
      description: "Extra fittings",
      quantity: 4,
    });

    expect(result.purchaseOrderLineId).toBeTruthy();
    expect(result.jobMaterialRequestId).toBeTruthy();

    const jmrInsert = calls.find((c) =>
      c.sql.includes("INSERT INTO job_material_request"),
    );
    expect(jmrInsert?.params?.[2]).toBeNull(); // site_zone_id = General
    expect(jmrInsert?.sql).toContain("'on_purchase_order'");

    const sourceInsert = calls.find((c) =>
      c.sql.includes("INSERT INTO purchase_order_line_source"),
    );
    expect(sourceInsert).toBeTruthy();
  });

  it("lands the backing request in the picked zone", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
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
      if (sql.includes("MAX(line_number)")) {
        return { rows: [{ max: null }] };
      }
      if (sql.includes("FROM purchase_order_line WHERE id")) {
        return { rows: [{ quantity: 1 }] };
      }
      if (sql.includes("FROM job_material_request WHERE id = ANY")) {
        return { rows: [{ id: "x", status: "on_purchase_order" }] };
      }
      return { rows: [], rowCount: 1 };
    });

    await addAdHocPurchaseOrderLineTx(client, "po-1", {
      description: "Zone part",
      quantity: 1,
      siteZoneId: "zone-lobby",
    });

    const jmrInsert = calls.find((c) =>
      c.sql.includes("INSERT INTO job_material_request"),
    );
    expect(jmrInsert?.params?.[2]).toBe("zone-lobby");
  });

  it("derives item_id from jobLinePartId and copies it onto both rows (IT2/Step5)", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
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
      if (sql.includes("FROM job_line_part jlp")) {
        return { rows: [{ item_id: "item-99" }] };
      }
      if (sql.includes("MAX(line_number)")) {
        return { rows: [{ max: 0 }] };
      }
      if (sql.includes("FROM purchase_order_line WHERE id")) {
        return { rows: [{ quantity: 2 }] };
      }
      if (sql.includes("FROM job_material_request WHERE id = ANY")) {
        return { rows: [{ id: "x", status: "on_purchase_order" }] };
      }
      return { rows: [], rowCount: 1 };
    });

    await addAdHocPurchaseOrderLineTx(client, "po-1", {
      description: "Tied to line",
      quantity: 2,
      jobLinePartId: "jlp-1",
    });

    const jmrInsert = calls.find((c) =>
      c.sql.includes("INSERT INTO job_material_request"),
    );
    expect(jmrInsert?.params?.[4]).toBe("item-99");

    const lineInsert = calls.find((c) =>
      c.sql.includes("INSERT INTO purchase_order_line ("),
    );
    expect(lineInsert?.params?.[10]).toBe("item-99");
  });

  it("leaves item_id null with no jobLinePartId (IT3 — no invented item)", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
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
      if (sql.includes("MAX(line_number)")) {
        return { rows: [{ max: 0 }] };
      }
      if (sql.includes("FROM purchase_order_line WHERE id")) {
        return { rows: [{ quantity: 1 }] };
      }
      if (sql.includes("FROM job_material_request WHERE id = ANY")) {
        return { rows: [{ id: "x", status: "on_purchase_order" }] };
      }
      return { rows: [], rowCount: 1 };
    });

    await addAdHocPurchaseOrderLineTx(client, "po-1", {
      description: "Freeform only",
      quantity: 1,
    });

    const jmrInsert = calls.find((c) =>
      c.sql.includes("INSERT INTO job_material_request"),
    );
    expect(jmrInsert?.params?.[4]).toBeNull();

    const itemLookup = calls.find((c) => c.sql.includes("FROM job_line_part jlp"));
    expect(itemLookup).toBeUndefined();
  });

  it("seeds description from vendor/manufacturer over request text (IT6)", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
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
      if (sql.includes("FROM purchase_order_line WHERE id")) {
        return { rows: [{ quantity: 1 }] };
      }
      if (sql.includes("FROM job_material_request WHERE id = ANY")) {
        return { rows: [{ id: "x", status: "on_purchase_order" }] };
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

    const jmrInsert = calls.find((c) =>
      c.sql.includes("INSERT INTO job_material_request"),
    );
    expect(jmrInsert?.params?.[6]).toBe("Request text");
  });
});
