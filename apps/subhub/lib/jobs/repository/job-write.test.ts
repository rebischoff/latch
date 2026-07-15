import { ConflictError, isConflictError } from "@latch/contracts";
import { describe, expect, it } from "vitest";

import { assertSiteIdChangeAllowed } from "./job-write";

describe("assertSiteIdChangeAllowed", () => {
  it("allows patch when site_id is unchanged", () => {
    expect(() =>
      assertSiteIdChangeAllowed(
        { site_id: "site-a", estimate_id: null },
        "site-a",
      ),
    ).not.toThrow();
  });

  it("allows site_id change when estimate_id is null", () => {
    expect(() =>
      assertSiteIdChangeAllowed(
        { site_id: "site-a", estimate_id: null },
        "site-b",
      ),
    ).not.toThrow();
  });

  it("rejects site_id change when estimate_id is set", () => {
    expect(() =>
      assertSiteIdChangeAllowed(
        { site_id: "site-a", estimate_id: "est-1" },
        "site-b",
      ),
    ).toThrow(ConflictError);

    try {
      assertSiteIdChangeAllowed(
        { site_id: "site-a", estimate_id: "est-1" },
        "site-b",
      );
    } catch (error) {
      expect(isConflictError(error)).toBe(true);
      expect(error).toMatchObject({
        message: "Cannot change site_id when job is linked to an estimate",
        details: {
          field: "profile",
          code: "site_id_frozen",
        },
      });
    }
  });
});
