import { describe, expect, it } from "vitest";

import { resolveItemLaborPhaseUiView } from "./item-labor-phase-ui-state";

describe("resolveItemLaborPhaseUiView", () => {
  it("returns category_editable for non-leaf nodes", () => {
    expect(
      resolveItemLaborPhaseUiView({
        isQuotableLeaf: false,
        ownRowCount: 0,
        inheritedRowCount: 2,
      }),
    ).toBe("category_editable");

    expect(
      resolveItemLaborPhaseUiView({
        isQuotableLeaf: false,
        ownRowCount: 3,
        inheritedRowCount: 0,
      }),
    ).toBe("category_editable");
  });

  it("returns override when the leaf has own rows", () => {
    expect(
      resolveItemLaborPhaseUiView({
        isQuotableLeaf: true,
        ownRowCount: 1,
        inheritedRowCount: 2,
      }),
    ).toBe("override");
  });

  it("returns inherited when the leaf has no own rows but cached ancestry", () => {
    expect(
      resolveItemLaborPhaseUiView({
        isQuotableLeaf: true,
        ownRowCount: 0,
        inheritedRowCount: 2,
      }),
    ).toBe("inherited");
  });

  it("returns empty when the leaf has no own rows and no ancestry", () => {
    expect(
      resolveItemLaborPhaseUiView({
        isQuotableLeaf: true,
        ownRowCount: 0,
        inheritedRowCount: 0,
      }),
    ).toBe("empty");
  });
});
