import { describe, expect, it } from "vitest";

import { ValidationError } from "@latch/contracts";
import { validateGrantTuple } from "@latch/policy";

import { spikePolicyRegistry } from "./policy-registry.js";

describe("validateGrantTuple (fixture registry)", () => {
  it("accepts grants on new fixture surfaces", () => {
    expect(() =>
      validateGrantTuple(
        { surfaceId: "alpha_list", fieldId: "title", action: "read" },
        spikePolicyRegistry,
      ),
    ).not.toThrow();

    expect(() =>
      validateGrantTuple(
        { surfaceId: "gamma_form", fieldId: "request_type", action: "approve" },
        spikePolicyRegistry,
      ),
    ).not.toThrow();
  });

  it("rejects unknown field ids on known surfaces", () => {
    expect(() =>
      validateGrantTuple(
        { surfaceId: "alpha_list", fieldId: "not_a_field", action: "read" },
        spikePolicyRegistry,
      ),
    ).toThrow(ValidationError);
  });

  it("rejects unknown surfaces", () => {
    expect(() =>
      validateGrantTuple(
        { surfaceId: "widget_list", fieldId: "label", action: "read" },
        spikePolicyRegistry,
      ),
    ).toThrow(ValidationError);
  });
});
