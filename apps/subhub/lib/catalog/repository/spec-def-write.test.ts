import { ValidationError } from "@latch/contracts";
import { describe, expect, it } from "vitest";

import { assertRootSpecDefinitionsPatch } from "./spec-def-write";

describe("assertRootSpecDefinitionsPatch", () => {
  it("allows root category patches", () => {
    expect(() => assertRootSpecDefinitionsPatch(true)).not.toThrow();
  });

  it("rejects nested category patches", () => {
    expect(() => assertRootSpecDefinitionsPatch(false)).toThrow(ValidationError);
  });
});
