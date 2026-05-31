import { describe, expect, it } from "vitest";
import { z } from "zod";

import { narrowSchema } from "./narrow.js";
import type { Manifest } from "./types.js";

const JobSchema = z.object({
  summary: z.string(),
  scope: z.string(),
  financial_terms: z.number(),
});

const manifest: Manifest = {
  surface: "job_detail",
  actions: ["read"],
  fields: {
    summary: ["read", "write"],
    scope: ["read", "write"],
    financial_terms: [],
  },
};

describe("narrowSchema", () => {
  it("writable schema rejects unknown keys (strict)", () => {
    const writable = narrowSchema(JobSchema, manifest, "write");

    expect(writable.safeParse({ summary: "ok", scope: "x" }).success).toBe(
      true,
    );
    expect(
      writable.safeParse({ summary: "ok", scope: "x", financial_terms: 1 })
        .success,
    ).toBe(false);
    expect(
      writable.safeParse({ summary: "ok", scope: "x", extra: "nope" }).success,
    ).toBe(false);
  });

  it("readable schema omits fields without read", () => {
    const readable = narrowSchema(JobSchema, manifest, "read");

    expect(readable.safeParse({ summary: "ok", scope: "x" }).success).toBe(
      true,
    );
    expect(
      readable.safeParse({ summary: "ok", financial_terms: 1 }).success,
    ).toBe(false);
  });
});
