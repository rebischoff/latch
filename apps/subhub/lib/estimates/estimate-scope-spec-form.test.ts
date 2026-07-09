import { describe, expect, it } from "vitest";

import {
  estimateScopeSpecToPatchBody,
  estimateScopeSpecsToDisplay,
} from "./estimate-scope-spec-form";

describe("estimateScopeSpecsToDisplay", () => {
  it("converts canonical bucket values to display units", () => {
    const display = estimateScopeSpecsToDisplay([
      {
        spec_def_id: "def-ton",
        value_type: "number",
        value_number: 3,
        to_canonical_factor: 1,
        spec_option_id: null,
        value_boolean: null,
      },
      {
        spec_def_id: "def-trip",
        value_type: "number",
        value_number: 16093.4,
        to_canonical_factor: 1609.34,
        spec_option_id: null,
        value_boolean: null,
      },
    ]);

    expect(display[0]?.value_number).toBe(3);
    expect(display[1]?.value_number).toBeCloseTo(10);
  });
});

describe("estimateScopeSpecToPatchBody", () => {
  it("stores canonical values for number/range bucket points", () => {
    const patch = estimateScopeSpecToPatchBody({
      spec_def_id: "def-trip",
      value_type: "number",
      value_number: 16,
      to_canonical_factor: 1,
      spec_option_id: null,
      value_boolean: null,
    });

    expect(patch.value_number).toBe(16);
    expect(patch.spec_option_id).toBeNull();
  });

  it("leaves blank bucket filters as null", () => {
    const patch = estimateScopeSpecToPatchBody({
      spec_def_id: "def-ton",
      value_type: "number",
      value_number: null,
      to_canonical_factor: 1,
      spec_option_id: null,
      value_boolean: null,
    });

    expect(patch.value_number).toBeNull();
  });
});
