import { describe, expect, it } from "vitest";

import { MASTER_DETAIL_SURFACES } from "@/lib/master-detail-registry";

import { resolveChildParentId } from "./resolve-child-parent-id";

describe("resolveChildParentId", () => {
  it("prefers selection over pathname entityId on category surfaces", () => {
    expect(
      resolveChildParentId({
        selectionId: "tree-selected",
        entityId: "stale-path-id",
        config: MASTER_DETAIL_SURFACES.items,
      }),
    ).toBe("tree-selected");
  });

  it("falls back to pathname entityId when selection is null on category surfaces", () => {
    expect(
      resolveChildParentId({
        selectionId: null,
        entityId: "deep-link-id",
        config: MASTER_DETAIL_SURFACES.items,
      }),
    ).toBe("deep-link-id");
  });

  it("returns null when both selection and entityId are null on category surfaces", () => {
    expect(
      resolveChildParentId({
        selectionId: null,
        entityId: null,
        config: MASTER_DETAIL_SURFACES.items,
      }),
    ).toBeNull();
  });

  it("uses pathname entityId on flat surfaces regardless of selection", () => {
    expect(
      resolveChildParentId({
        selectionId: "ignored-selection",
        entityId: "site-1",
        config: MASTER_DETAIL_SURFACES.sites,
      }),
    ).toBe("site-1");
  });

  it("returns null on flat surfaces when entityId is null", () => {
    expect(
      resolveChildParentId({
        selectionId: null,
        entityId: null,
        config: MASTER_DETAIL_SURFACES.sites,
      }),
    ).toBeNull();
  });
});
