import { ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { batchCreatePurchaseOrdersTx } from "./batch-create";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount?: number }>;

const createClient = (query: QueryFn): PoolClient =>
  ({ query } as unknown as PoolClient);

describe("batchCreatePurchaseOrdersTx", () => {
  let calls: Array<{ sql: string; params?: unknown[] }>;

  beforeEach(() => {
    calls = [];
  });

  it("rolls up two zone requests for the same part into one line with two sources", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM job_material_request") && sql.includes("ANY")) {
        return {
          rows: [
            {
              id: "jmr-a",
              job_id: "job-1",
              site_zone_id: "zone-1",
              job_line_part_id: "jlp-1",
              part_id: "part-1",
              description: "Cable",
              quantity: 3,
              unit: "ea",
              status: "open",
            },
            {
              id: "jmr-b",
              job_id: "job-1",
              site_zone_id: "zone-2",
              job_line_part_id: "jlp-1",
              part_id: "part-1",
              description: "Cable",
              quantity: 7,
              unit: "ea",
              status: "open",
            },
          ],
        };
      }
      if (sql.includes("FROM manufacturer_part mp")) {
        return {
          rows: [
            {
              id: "vp-1",
              unit_price: 12,
              vendor_description: null,
              manufacturer_description: "",
            },
          ],
        };
      }
      if (sql.includes("FROM purchase_order_line WHERE id")) {
        return { rows: [{ quantity: 10 }] };
      }
      if (
        sql.includes("FROM job_material_request WHERE id = ANY") &&
        sql.includes("status")
      ) {
        return {
          rows: [
            { id: "jmr-a", status: "open" },
            { id: "jmr-b", status: "open" },
          ],
        };
      }
      return { rows: [], rowCount: 1 };
    });

    const result = await batchCreatePurchaseOrdersTx(client, {
      selections: [
        { jobMaterialRequestId: "jmr-a", vendorPartyId: "vendor-1" },
        { jobMaterialRequestId: "jmr-b", vendorPartyId: "vendor-1" },
      ],
    });

    expect(result.purchaseOrderIds).toHaveLength(1);

    const poInserts = calls.filter((c) =>
      c.sql.includes("INSERT INTO purchase_order "),
    );
    expect(poInserts).toHaveLength(1);

    const lineInserts = calls.filter((c) =>
      c.sql.includes("INSERT INTO purchase_order_line "),
    );
    expect(lineInserts).toHaveLength(1);
    expect(lineInserts[0]?.params?.[4]).toBe(10); // rolled-up qty

    const sourceInserts = calls.filter((c) =>
      c.sql.includes("INSERT INTO purchase_order_line_source"),
    );
    expect(sourceInserts).toHaveLength(2);
    expect(sourceInserts[0]?.params?.[3]).toBe(3);
    expect(sourceInserts[1]?.params?.[3]).toBe(7);

    const statusFlip = calls.find((c) =>
      c.sql.includes("SET status = 'on_purchase_order'"),
    );
    expect(statusFlip).toBeTruthy();
  });

  it("creates separate draft POs for two vendors", async () => {
    const allRequests = [
      {
        id: "jmr-a",
        job_id: "job-1",
        site_zone_id: null,
        job_line_part_id: null,
        part_id: "part-1",
        description: "A",
        quantity: 1,
        unit: "ea",
        status: "open",
      },
      {
        id: "jmr-b",
        job_id: "job-1",
        site_zone_id: null,
        job_line_part_id: null,
        part_id: "part-2",
        description: "B",
        quantity: 2,
        unit: "ea",
        status: "open",
      },
    ];

    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM job_material_request") && sql.includes("ANY")) {
        const ids = (params?.[0] as string[]) ?? [];
        return {
          rows: allRequests.filter((r) => ids.includes(r.id)),
        };
      }
      if (sql.includes("FROM manufacturer_part mp")) {
        return { rows: [] };
      }
      if (sql.includes("FROM purchase_order_line WHERE id")) {
        const lastLine = [...calls]
          .reverse()
          .find((c) => c.sql.includes("INSERT INTO purchase_order_line "));
        return { rows: [{ quantity: lastLine?.params?.[4] ?? 1 }] };
      }
      return { rows: [], rowCount: 1 };
    });

    const result = await batchCreatePurchaseOrdersTx(client, {
      selections: [
        { jobMaterialRequestId: "jmr-a", vendorPartyId: "vendor-1" },
        { jobMaterialRequestId: "jmr-b", vendorPartyId: "vendor-2" },
      ],
    });

    expect(result.purchaseOrderIds).toHaveLength(2);
    const poInserts = calls.filter((c) =>
      c.sql.includes("INSERT INTO purchase_order "),
    );
    expect(poInserts).toHaveLength(2);
  });

  it("rejects empty selections", async () => {
    const client = createClient(async () => ({ rows: [] }));
    await expect(
      batchCreatePurchaseOrdersTx(client, { selections: [] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("splits remainder when staged qty is less than open ask", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (
        sql.includes("FROM job_material_request") &&
        sql.includes("ANY") &&
        sql.includes("description")
      ) {
        return {
          rows: [
            {
              id: "jmr-a",
              job_id: "job-1",
              site_zone_id: "zone-1",
              job_line_part_id: "jlp-1",
              part_id: "part-1",
              description: "Cable",
              quantity: 10,
              unit: "ea",
              status: "open",
            },
          ],
        };
      }
      if (sql.includes("FROM manufacturer_part mp")) {
        return {
          rows: [
            {
              id: "vp-1",
              unit_price: 12,
              vendor_description: null,
              manufacturer_description: "",
            },
          ],
        };
      }
      if (sql.includes("FROM purchase_order_line WHERE id")) {
        return { rows: [{ quantity: 4 }] };
      }
      if (
        sql.includes("FROM job_material_request WHERE id = ANY") &&
        sql.includes("status")
      ) {
        return { rows: [{ id: "jmr-a", status: "open" }] };
      }
      return { rows: [], rowCount: 1 };
    });

    const result = await batchCreatePurchaseOrdersTx(client, {
      selections: [
        {
          jobMaterialRequestId: "jmr-a",
          vendorPartyId: "vendor-1",
          quantity: 4,
        },
      ],
    });

    expect(result.purchaseOrderIds).toHaveLength(1);

    const remainderInsert = calls.find(
      (c) =>
        c.sql.includes("INSERT INTO job_material_request") &&
        c.params?.[7] === 6,
    );
    expect(remainderInsert).toBeTruthy();

    const qtyUpdate = calls.find(
      (c) =>
        c.sql.includes("SET quantity = $1") &&
        c.sql.includes("job_material_request") &&
        c.params?.[0] === 4,
    );
    expect(qtyUpdate).toBeTruthy();

    const lineInserts = calls.filter((c) =>
      c.sql.includes("INSERT INTO purchase_order_line "),
    );
    expect(lineInserts[0]?.params?.[4]).toBe(4);
  });

  it("rejects staged qty above open ask", async () => {
    const client = createClient(async (sql) => {
      calls.push({ sql });
      if (sql.includes("FROM job_material_request") && sql.includes("ANY")) {
        return {
          rows: [
            {
              id: "jmr-a",
              job_id: "job-1",
              site_zone_id: null,
              job_line_part_id: null,
              part_id: "part-1",
              description: "A",
              quantity: 2,
              unit: "ea",
              status: "open",
            },
          ],
        };
      }
      return { rows: [] };
    });

    await expect(
      batchCreatePurchaseOrdersTx(client, {
        selections: [
          {
            jobMaterialRequestId: "jmr-a",
            vendorPartyId: "vendor-1",
            quantity: 5,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("applies staged partId before creating the PO line", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (
        sql.includes("FROM job_material_request") &&
        sql.includes("ANY") &&
        sql.includes("description")
      ) {
        return {
          rows: [
            {
              id: "jmr-a",
              job_id: "job-1",
              site_zone_id: null,
              job_line_part_id: null,
              part_id: null,
              description: "TBD",
              quantity: 1,
              unit: "ea",
              status: "open",
            },
          ],
        };
      }
      if (sql.includes("FROM manufacturer_part mp")) {
        return {
          rows: [
            {
              id: "vp-1",
              unit_price: 9,
              vendor_description: null,
              manufacturer_description: "",
            },
          ],
        };
      }
      if (sql.includes("FROM purchase_order_line WHERE id")) {
        return { rows: [{ quantity: 1 }] };
      }
      if (
        sql.includes("FROM job_material_request WHERE id = ANY") &&
        sql.includes("status")
      ) {
        return { rows: [{ id: "jmr-a", status: "open" }] };
      }
      return { rows: [], rowCount: 1 };
    });

    await batchCreatePurchaseOrdersTx(client, {
      selections: [
        {
          jobMaterialRequestId: "jmr-a",
          vendorPartyId: "vendor-1",
          partId: "part-99",
        },
      ],
    });

    const partUpdate = calls.find(
      (c) =>
        c.sql.includes("SET part_id = $1") && c.params?.[0] === "part-99",
    );
    expect(partUpdate).toBeTruthy();

    const lineInserts = calls.filter((c) =>
      c.sql.includes("INSERT INTO purchase_order_line "),
    );
    expect(lineInserts[0]?.params?.[7]).toBe("part-99");
  });
});

// silence unused vi in case of future mocks
void vi;
