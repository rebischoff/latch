import { ConflictError, ValidationError, isConflictError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  assertSiteChangeClearsStructure,
  assertSiteExists,
  assertSiteIdChangeAllowed,
} from "./estimate-write";

describe("assertSiteIdChangeAllowed", () => {
  const existing = { site_id: "site-a", status: "draft" };

  it("allows patch when site_id is unchanged", () => {
    expect(() => assertSiteIdChangeAllowed(existing, "site-a")).not.toThrow();
  });

  it("allows site_id change on draft", () => {
    expect(() => assertSiteIdChangeAllowed(existing, "site-b")).not.toThrow();
  });

  it("rejects site_id change when estimate is frozen", () => {
    for (const status of ["won", "lost", "expired"] as const) {
      expect(() =>
        assertSiteIdChangeAllowed({ site_id: "site-a", status }, "site-b"),
      ).toThrow(ConflictError);

      try {
        assertSiteIdChangeAllowed({ site_id: "site-a", status }, "site-b");
      } catch (error) {
        expect(isConflictError(error)).toBe(true);
        expect(error).toMatchObject({
          message: "Cannot change site_id on a frozen estimate",
          details: {
            field: "profile",
            code: "site_id_frozen",
          },
        });
      }
    }
  });
});

describe("assertSiteChangeClearsStructure", () => {
  const base = {
    existingSiteId: "site-a",
    nextSiteId: "site-b",
    status: "draft",
    existingConditionCount: 0,
    existingLineCount: 0,
  };

  it("no-ops when site_id is unchanged", () => {
    expect(() =>
      assertSiteChangeClearsStructure({
        ...base,
        nextSiteId: "site-a",
        body: {},
        existingConditionCount: 2,
      }),
    ).not.toThrow();
  });

  it("allows site change with empty collections in body", () => {
    expect(() =>
      assertSiteChangeClearsStructure({
        ...base,
        body: { conditions: [], line_items: [] },
        existingConditionCount: 2,
        existingLineCount: 1,
      }),
    ).not.toThrow();
  });

  it("allows site change with omitted collections when DB structure is empty", () => {
    expect(() =>
      assertSiteChangeClearsStructure({
        ...base,
        body: { profile: { site_id: "site-b" } },
      }),
    ).not.toThrow();
  });

  it("rejects non-empty conditions when site changes", () => {
    expect(() =>
      assertSiteChangeClearsStructure({
        ...base,
        body: { conditions: [{ id: "c1" }], line_items: [] },
      }),
    ).toThrow(ConflictError);

    try {
      assertSiteChangeClearsStructure({
        ...base,
        body: { conditions: [{ id: "c1" }], line_items: [] },
      });
    } catch (error) {
      expect(error).toMatchObject({
        details: {
          field: "profile",
          code: "site_change_requires_clear",
        },
      });
    }
  });

  it("rejects omitted collections when DB has structure", () => {
    expect(() =>
      assertSiteChangeClearsStructure({
        ...base,
        body: { profile: { site_id: "site-b" } },
        existingConditionCount: 1,
        existingLineCount: 0,
      }),
    ).toThrow(ConflictError);
  });

  it("rejects site change when frozen even with empty collections", () => {
    expect(() =>
      assertSiteChangeClearsStructure({
        ...base,
        status: "won",
        body: { conditions: [], line_items: [] },
      }),
    ).toThrow(ConflictError);
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
