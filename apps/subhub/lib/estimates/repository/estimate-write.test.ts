import { ConflictError, ValidationError, isConflictError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  assertSiteExists,
  assertSiteIdUnchanged,
} from "./estimate-write";

describe("assertSiteIdUnchanged", () => {
  const existing = { site_id: "site-a" };

  it("allows patch when site_id is unchanged", () => {
    expect(() => assertSiteIdUnchanged(existing, "site-a")).not.toThrow();
  });

  it("rejects site_id change with structured ConflictError", () => {
    expect(() => assertSiteIdUnchanged(existing, "site-b")).toThrow(ConflictError);

    try {
      assertSiteIdUnchanged(existing, "site-b");
    } catch (error) {
      expect(isConflictError(error)).toBe(true);
      expect(error).toMatchObject({
        message: "Cannot change site_id after estimate is created",
        details: {
          field: "profile",
          code: "site_id_immutable",
        },
      });
    }
  });
});

describe("assertSiteExists", () => {
  it("rejects unknown site_id on create", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as PoolClient;

    await expect(assertSiteExists(client, "missing-site")).rejects.toMatchObject({
      details: {
        field: "profile",
        code: "unknown_site",
      },
    });
    await expect(assertSiteExists(client, "missing-site")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("allows known site_id", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ id: "site-1" }] }),
    } as unknown as PoolClient;

    await expect(assertSiteExists(client, "site-1")).resolves.toBeUndefined();
  });
});
