import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";

import { loadPoolRollupForJob, poolRollupKey } from "./pool";

describe("poolRollupKey", () => {
  it("keys known parts by part_id", () => {
    expect(
      poolRollupKey({ part_id: "part-1", description: "Cable" }),
    ).toBe("part:part-1");
  });

  it("keys soft-spec by normalized description", () => {
    expect(
      poolRollupKey({ part_id: null, description: "  Soft Spec  " }),
    ).toBe("soft:soft spec");
  });

  it("does not merge unrelated TBD descriptions", () => {
    expect(poolRollupKey({ part_id: null, description: "A" })).not.toBe(
      poolRollupKey({ part_id: null, description: "B" }),
    );
  });
});

describe("loadPoolRollupForJob grouping (pure assembly)", () => {
  /**
   * Mirrors repository rollup assembly without a DB — two zones same part → one
   * row; same part two jobs would be separate calls (job-scoped).
   */
  type Flat = {
    id: string;
    job_id: string;
    job_title: string;
    site_zone_id: string | null;
    site_zone_name: string | null;
    part_id: string | null;
    part_mpn: string | null;
    description: string;
    quantity: number;
    unit: string;
  };

  const assemble = (rows: Flat[]) => {
    const zoneKey = (id: string | null) => id ?? "__general__";
    const rollups = new Map<
      string,
      {
        key: string;
        part_id: string | null;
        quantity: number;
        zones: Array<{
          site_zone_id: string | null;
          quantity: number;
          requests: Array<{ id: string; quantity: number }>;
        }>;
      }
    >();

    for (const row of rows) {
      const key = poolRollupKey(row);
      const existing = rollups.get(key);
      const zKey = zoneKey(row.site_zone_id);
      if (!existing) {
        rollups.set(key, {
          key,
          part_id: row.part_id,
          quantity: row.quantity,
          zones: [
            {
              site_zone_id: row.site_zone_id,
              quantity: row.quantity,
              requests: [{ id: row.id, quantity: row.quantity }],
            },
          ],
        });
        continue;
      }
      existing.quantity += row.quantity;
      const zone = existing.zones.find((z) => zoneKey(z.site_zone_id) === zKey);
      if (zone) {
        zone.quantity += row.quantity;
        zone.requests.push({ id: row.id, quantity: row.quantity });
      } else {
        existing.zones.push({
          site_zone_id: row.site_zone_id,
          quantity: row.quantity,
          requests: [{ id: row.id, quantity: row.quantity }],
        });
      }
    }
    return [...rollups.values()];
  };

  it("rolls two zones of the same part on one job into one row", () => {
    const result = assemble([
      {
        id: "a",
        job_id: "job-1",
        job_title: "Alpha",
        site_zone_id: "z1",
        site_zone_name: "Lobby",
        part_id: "part-1",
        part_mpn: "PN-1",
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
        part_id: "part-1",
        part_mpn: "PN-1",
        description: "Cable",
        quantity: 7,
        unit: "ea",
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.quantity).toBe(10);
    expect(result[0]?.zones).toHaveLength(2);
  });

  it("keeps soft-spec blank PN selectable as its own row", () => {
    const result = assemble([
      {
        id: "soft",
        job_id: "job-1",
        job_title: "Alpha",
        site_zone_id: null,
        site_zone_name: null,
        part_id: null,
        part_mpn: null,
        description: "TBD bracket",
        quantity: 2,
        unit: "ea",
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.part_id).toBeNull();
    expect(result[0]?.key).toBe("soft:tbd bracket");
  });
});

describe("loadPoolRollupForJob — Item label + narrowed parts (task 59 IT4/IT5)", () => {
  const makePool = (
    rows: Record<string, unknown>[],
    partItemRows: Record<string, unknown>[] = [],
  ): Pool => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM job_material_request jmr")) {
        return { rows };
      }
      if (sql.includes("FROM vendor_part vp")) {
        return { rows: [] };
      }
      if (sql.includes("FROM part_item pi")) {
        return { rows: partItemRows };
      }
      return { rows: [] };
    });
    return { query } as unknown as Pool;
  };

  it("shows the single item's name when every merged request shares it (IT1)", async () => {
    const pool = makePool([
      {
        id: "jmr-a",
        job_id: "job-1",
        job_title: "Alpha",
        site_zone_id: null,
        site_zone_name: null,
        job_line_part_id: "jlp-1",
        item_id: "item-A",
        item_name: "Strobe",
        part_id: "part-1",
        part_mpn: "PN-1",
        part_description: "Strobe desc",
        description: "Strobe",
        quantity: 3,
        unit: "ea",
      },
    ]);

    const rows = await loadPoolRollupForJob(pool, "job-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.item_label).toBe("Strobe");
    expect(rows[0]?.item_ids).toEqual(["item-A"]);
    expect(rows[0]?.part_description).toBe("Strobe desc");
  });

  it("shows Multiple when the rollup merges >1 distinct item_id and unions their linked parts (IT4)", async () => {
    const pool = makePool(
      [
        {
          id: "jmr-a",
          job_id: "job-1",
          job_title: "Alpha",
          site_zone_id: "z1",
          site_zone_name: "Lobby",
          job_line_part_id: "jlp-1",
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
          item_id: "item-B",
          item_name: "Horn/Strobe",
          part_id: "part-1",
          part_mpn: "PN-1",
          part_description: "Strobe desc",
          description: "Strobe",
          quantity: 4,
          unit: "ea",
        },
      ],
      [
        { item_id: "item-A", part_id: "part-1", mpn: "PN-1", description: "Strobe desc" },
        { item_id: "item-B", part_id: "part-1", mpn: "PN-1", description: "Strobe desc" },
        { item_id: "item-B", part_id: "part-2", mpn: "PN-2", description: "Horn desc" },
      ],
    );

    const rows = await loadPoolRollupForJob(pool, "job-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.item_label).toBe("Multiple");
    expect([...(rows[0]?.item_ids ?? [])].sort()).toEqual(["item-A", "item-B"]);
    expect(rows[0]?.part_options.map((o) => o.part_id).sort()).toEqual([
      "part-1",
      "part-2",
    ]);
  });

  it("keeps item_label null and part_options empty for ad-hoc rows (IT3/IT8)", async () => {
    const pool = makePool([
      {
        id: "jmr-a",
        job_id: "job-1",
        job_title: "Alpha",
        site_zone_id: null,
        site_zone_name: null,
        job_line_part_id: null,
        item_id: null,
        item_name: null,
        part_id: null,
        part_mpn: null,
        part_description: null,
        description: "TBD bracket",
        quantity: 2,
        unit: "ea",
      },
    ]);

    const rows = await loadPoolRollupForJob(pool, "job-1");
    expect(rows[0]?.item_label).toBeNull();
    expect(rows[0]?.part_options).toEqual([]);
  });
});
