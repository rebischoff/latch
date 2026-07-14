import { ValidationError } from "@latch/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  assertBucketSpecMutualExclusion,
  isBucketSpecBlank,
  isBucketSpecValueSet,
  replaceLineBucketSpecsTx,
} from "./estimate-bucket-spec-write";

describe("isBucketSpecBlank", () => {
  it("treats all-null bucket row as blank", () => {
    expect(
      isBucketSpecBlank({
        spec_def_id: "def-1",
        spec_option_id: null,
        value_boolean: null,
        value_number: null,
        value_number_max: null,
      }),
    ).toBe(true);
  });
});

describe("isBucketSpecValueSet", () => {
  it("treats max-only number bucket as set (T7)", () => {
    expect(
      isBucketSpecValueSet({
        spec_def_id: "def-num",
        value_type: "number",
        value_number: null,
        value_number_max: 135,
      }),
    ).toBe(true);
  });

  it("treats enum option as set", () => {
    expect(
      isBucketSpecValueSet({
        spec_def_id: "def-enum",
        value_type: "enum",
        spec_option_id: "opt-1",
      }),
    ).toBe(true);
  });
});

describe("assertBucketSpecMutualExclusion", () => {
  it("rejects option plus numeric bounds", () => {
    expect(() =>
      assertBucketSpecMutualExclusion(
        {
          spec_def_id: "def-1",
          spec_option_id: "opt-1",
          value_number: 10,
        },
        "conditions",
      ),
    ).toThrow(ValidationError);
  });
});

describe("replaceLineBucketSpecsTx", () => {
  it("writes value_number_max column", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const client = {
      query: vi.fn(async (sql: string, params: unknown[] = []) => {
        queries.push({ sql, params });
        return { rows: [] };
      }),
    };

    await replaceLineBucketSpecsTx(client as never, "line-1", [
      {
        spec_def_id: "def-num",
        value_number: 135,
        value_number_max: null,
      },
      {
        spec_def_id: "def-enum",
        spec_option_id: "opt-1",
      },
    ]);

    const insert = queries.find((entry) => entry.sql.includes("INSERT INTO estimate_line_spec"));
    expect(insert).toBeDefined();
    expect(insert?.sql.includes("spec_threshold_preset_id")).toBe(false);
    expect(queries.some((entry) => entry.sql.includes("DELETE FROM estimate_line_spec"))).toBe(
      true,
    );
  });
});
