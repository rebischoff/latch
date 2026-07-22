import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  isPoolRowPoEligible,
  loadPoolRollupForJobUnlocked,
  poolRollupKey,
} from "./pool";

describe("poolRollupKey (RP4 — one row per job_line_part)", () => {
  it("keys engineered demand by job_line_part_id", () => {
    expect(
      poolRollupKey({
        id: "jmr-1",
        job_line_part_id: "jlp-1",
        part_id: "part-1",
        description: "Cable",
      }),
    ).toBe("jlp:jlp-1");
  });

  it("does not merge two lines that share a part_id", () => {
    expect(
      poolRollupKey({
        id: "a",
        job_line_part_id: "jlp-1",
        part_id: "part-1",
      }),
    ).not.toBe(
      poolRollupKey({
        id: "b",
        job_line_part_id: "jlp-2",
        part_id: "part-1",
      }),
    );
  });

  it("keys legacy ad-hoc rows by request id", () => {
    expect(
      poolRollupKey({
        id: "soft-1",
        job_line_part_id: null,
        part_id: null,
        description: "TBD",
      }),
    ).toBe("req:soft-1");
  });
});

describe("isPoolRowPoEligible (RP6)", () => {
  it("requires both part and vendor", () => {
    expect(isPoolRowPoEligible({ partId: null, vendorPartyId: "v1" })).toBe(
      false,
    );
    expect(isPoolRowPoEligible({ partId: "p1", vendorPartyId: null })).toBe(
      false,
    );
    expect(isPoolRowPoEligible({ partId: "p1", vendorPartyId: "v1" })).toBe(
      true,
    );
  });
});

describe("loadPoolRollupForJobUnlocked grouping", () => {
  const makePool = (rows: Record<string, unknown>[]): Pool => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM job_material_request jmr")) {
        return { rows };
      }
      if (sql.includes("FROM vendor_part vp")) {
        return { rows: [] };
      }
      return { rows: [] };
    });
    return { query } as unknown as Pool;
  };

  it("keeps two lines with the same part as two pool rows (RP4)", async () => {
    const pool = makePool([
      {
        id: "jmr-a",
        job_id: "job-1",
        job_title: "Alpha",
        site_zone_id: "z1",
        site_zone_name: "Lobby",
        job_line_part_id: "jlp-1",
        job_line_id: "jl-1",
        job_condition_id: "jc-1",
        item_id: "item-A",
        item_name: "Strobe",
        part_id: "part-1",
        part_mpn: "PN-1",
        part_description: "Strobe desc",
        description: "Strobe",
        quantity: 3,
        unit: "ea",
      },
      {
        id: "jmr-b",
        job_id: "job-1",
        job_title: "Alpha",
        site_zone_id: "z2",
        site_zone_name: "Roof",
        job_line_part_id: "jlp-2",
        job_line_id: "jl-2",
        job_condition_id: "jc-1",
        item_id: "item-B",
        item_name: "Horn/Strobe",
        part_id: "part-1",
        part_mpn: "PN-1",
        part_description: "Strobe desc",
        description: "Strobe",
        quantity: 4,
        unit: "ea",
      },
    ]);

    const rows = await loadPoolRollupForJobUnlocked(pool, "job-1");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.key).sort()).toEqual(["jlp:jlp-1", "jlp:jlp-2"]);
    expect(rows.every((r) => r.item_label !== "Multiple")).toBe(true);
    expect(rows[0]?.job_line_id).toBeTruthy();
    expect(rows[0]?.job_condition_id).toBe("jc-1");
    expect(rows[0]?.part_options).toEqual([]);
  });

  it("merges two zones of the same job_line_part into one row", async () => {
    const pool = makePool([
      {
        id: "a",
        job_id: "job-1",
        job_title: "Alpha",
        site_zone_id: "z1",
        site_zone_name: "Lobby",
        job_line_part_id: "jlp-1",
        job_line_id: "jl-1",
        job_condition_id: "jc-1",
        item_id: "item-A",
        item_name: "Cable",
        part_id: "part-1",
        part_mpn: "PN-1",
        part_description: "Cat6",
        description: "Cable",
        quantity: 3,
        unit: "ea",
      },
      {
        id: "b",
        job_id: "job-1",
        job_title: "Alpha",
        site_zone_id: "z2",
        site_zone_name: "Roof",
        job_line_part_id: "jlp-1",
        job_line_id: "jl-1",
        job_condition_id: "jc-1",
        item_id: "item-A",
        item_name: "Cable",
        part_id: "part-1",
        part_mpn: "PN-1",
        part_description: "Cat6",
        description: "Cable",
        quantity: 7,
        unit: "ea",
      },
    ]);

    const rows = await loadPoolRollupForJobUnlocked(pool, "job-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.quantity).toBe(10);
    expect(rows[0]?.zones).toHaveLength(2);
    expect(rows[0]?.po_eligible).toBe(true);
  });

  it("marks blank-PN rows as not po_eligible (RP6)", async () => {
    const pool = makePool([
      {
        id: "soft",
        job_id: "job-1",
        job_title: "Alpha",
        site_zone_id: null,
        site_zone_name: null,
        job_line_part_id: "jlp-1",
        job_line_id: "jl-1",
        job_condition_id: "jc-1",
        item_id: "item-A",
        item_name: "Bracket",
        part_id: null,
        part_mpn: null,
        part_description: null,
        description: "TBD bracket",
        quantity: 2,
        unit: "ea",
      },
    ]);

    const rows = await loadPoolRollupForJobUnlocked(pool, "job-1");
    expect(rows[0]?.po_eligible).toBe(false);
    expect(rows[0]?.item_label).toBe("Bracket");
  });
});
