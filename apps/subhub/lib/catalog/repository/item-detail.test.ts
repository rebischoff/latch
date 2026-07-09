import { describe, expect, it } from "vitest";

import { buildSpecParticipation } from "./item-detail";

describe("buildSpecParticipation", () => {
  it("marks active defs from participation set", () => {
    const result = buildSpecParticipation(
      [
        { id: "slc", display_name: "SLC protocol", value_type: "enum" },
        { id: "color", display_name: "Color", value_type: "enum" },
      ],
      new Set(["slc"]),
    );

    expect(result.participates).toEqual([
      {
        spec_def_id: "slc",
        display_name: "SLC protocol",
        value_type: "enum",
        active: true,
      },
      {
        spec_def_id: "color",
        display_name: "Color",
        value_type: "enum",
        active: false,
      },
    ]);
  });
});
