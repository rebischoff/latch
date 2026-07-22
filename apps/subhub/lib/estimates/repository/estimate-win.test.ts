import { ConflictError, isConflictError } from "@latch/contracts";
import { describe, expect, it } from "vitest";

import {
  ACTIVE_JOB_STATUSES,
  buildJobTitle,
  canRecallEstimate,
  canRejectEstimate,
  canSubmitEstimate,
  collectSliceConditionIds,
  isAcceptableStatus,
  isEstimateFrozenStatus,
  partitionLineIdsByCatalogScope,
} from "./estimate-win";

describe("partitionLineIdsByCatalogScope (W1a)", () => {
  const scopeByItemId = new Map([
    ["item-a1", "scope-a"],
    ["item-a2", "scope-a"],
    ["item-b1", "scope-b"],
  ]);

  it("groups line ids by their catalog scope root", () => {
    const byScope = partitionLineIdsByCatalogScope(
      [
        { id: "line-1", item_id: "item-a1" },
        { id: "line-2", item_id: "item-b1" },
        { id: "line-3", item_id: "item-a2" },
      ],
      scopeByItemId,
    );

    expect(byScope.get("scope-a")).toEqual(["line-1", "line-3"]);
    expect(byScope.get("scope-b")).toEqual(["line-2"]);
    expect(byScope.size).toBe(2);
  });

  it("produces one slice for a single-scope estimate", () => {
    const byScope = partitionLineIdsByCatalogScope(
      [
        { id: "line-1", item_id: "item-a1" },
        { id: "line-2", item_id: "item-a2" },
      ],
      scopeByItemId,
    );

    expect(byScope.size).toBe(1);
    expect(byScope.get("scope-a")).toEqual(["line-1", "line-2"]);
  });

  it("skips lines without an item or resolvable scope", () => {
    const byScope = partitionLineIdsByCatalogScope(
      [
        { id: "line-1", item_id: null },
        { id: "line-2", item_id: "item-unknown" },
        { id: "line-3", item_id: "item-b1" },
      ],
      scopeByItemId,
    );

    expect(byScope.size).toBe(1);
    expect(byScope.get("scope-b")).toEqual(["line-3"]);
  });
});

describe("collectSliceConditionIds (W1a condition partition)", () => {
  const parentByConditionId = new Map<string, string | null>([
    ["root", null],
    ["mid", "root"],
    ["leaf", "mid"],
    ["other-root", null],
  ]);

  it("includes bound conditions and all ancestors up to root", () => {
    const ids = collectSliceConditionIds(["leaf"], parentByConditionId);
    expect([...ids].sort()).toEqual(["leaf", "mid", "root"]);
  });

  it("unions ancestors across multiple bound conditions", () => {
    const ids = collectSliceConditionIds(["leaf", "other-root"], parentByConditionId);
    expect([...ids].sort()).toEqual(["leaf", "mid", "other-root", "root"]);
  });

  it("is safe against cycles in parent chains", () => {
    const cyclic = new Map<string, string | null>([
      ["a", "b"],
      ["b", "a"],
    ]);
    const ids = collectSliceConditionIds(["a"], cyclic);
    expect([...ids].sort()).toEqual(["a", "b"]);
  });
});

describe("buildJobTitle (W2 title prefill)", () => {
  it("joins estimate title and catalog scope name", () => {
    expect(buildJobTitle("Acme Fire Alarm", "Fire Alarm")).toBe(
      "Acme Fire Alarm — Fire Alarm",
    );
  });

  it("falls back to the estimate title when scope name is missing", () => {
    expect(buildJobTitle("Acme Fire Alarm", null)).toBe("Acme Fire Alarm");
  });

  it("falls back to the scope name when the estimate title is blank", () => {
    expect(buildJobTitle("   ", "Fire Alarm")).toBe("Fire Alarm");
  });
});

describe("status transition graph (ST1–ST10)", () => {
  it("allows submit only from draft", () => {
    expect(canSubmitEstimate("draft")).toBe(true);
    expect(canSubmitEstimate("submitted")).toBe(false);
    expect(canSubmitEstimate("accepted")).toBe(false);
    expect(canSubmitEstimate("rejected")).toBe(false);
  });

  it("allows accept only from submitted", () => {
    expect(isAcceptableStatus("submitted")).toBe(true);
    expect(isAcceptableStatus("draft")).toBe(false);
    expect(isAcceptableStatus("accepted")).toBe(false);
    expect(isAcceptableStatus("rejected")).toBe(false);
  });

  it("allows reject from draft or submitted", () => {
    expect(canRejectEstimate("draft")).toBe(true);
    expect(canRejectEstimate("submitted")).toBe(true);
    expect(canRejectEstimate("accepted")).toBe(false);
    expect(canRejectEstimate("rejected")).toBe(false);
  });

  it("allows recall only from submitted", () => {
    expect(canRecallEstimate("submitted")).toBe(true);
    expect(canRecallEstimate("draft")).toBe(false);
    expect(canRecallEstimate("accepted")).toBe(false);
    expect(canRecallEstimate("rejected")).toBe(false);
  });

  it("freezes submitted, accepted, and rejected", () => {
    expect(isEstimateFrozenStatus("draft")).toBe(false);
    expect(isEstimateFrozenStatus("submitted")).toBe(true);
    expect(isEstimateFrozenStatus("accepted")).toBe(true);
    expect(isEstimateFrozenStatus("rejected")).toBe(true);
  });

  it("exposes the active-job set for W1c", () => {
    expect([...ACTIVE_JOB_STATUSES]).toEqual(["planned", "active"]);
  });
});

describe("structured conflict shapes", () => {
  it("uses a site_has_active_job code (W1c)", () => {
    const error = new ConflictError("Site already has an active job", {
      field: "site",
      code: "site_has_active_job",
      site_id: "site-1",
      job_ids: ["job-1"],
    });

    expect(isConflictError(error)).toBe(true);
    expect(error.details).toMatchObject({
      code: "site_has_active_job",
      job_ids: ["job-1"],
    });
  });

  it("uses a job_exists_for_scope code for duplicate slices", () => {
    const error = new ConflictError("A job already exists for this catalog scope", {
      field: "catalog_scope_item_id",
      code: "job_exists_for_scope",
      catalog_scope_item_id: "scope-a",
    });

    expect(error.details).toMatchObject({ code: "job_exists_for_scope" });
  });
});
