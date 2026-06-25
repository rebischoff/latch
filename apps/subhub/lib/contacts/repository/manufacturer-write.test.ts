import { ValidationError } from "@latch/contracts";
import { describe, expect, it } from "vitest";

import type { ManufacturerDetailRow } from "../descriptors/manufacturer-detail";
import {
  assertManufacturerKindImmutable,
  computeOrgDisplayName,
  computePersonDisplayName,
  PartyRoleActionSchema,
} from "./manufacturer-write";

describe("computePersonDisplayName", () => {
  it("joins first and last name", () => {
    expect(computePersonDisplayName("Ada", "Lovelace")).toBe("Ada Lovelace");
  });

  it("falls back when last name is empty", () => {
    expect(computePersonDisplayName("Ada", "")).toBe("Ada");
  });
});

describe("computeOrgDisplayName", () => {
  it("prefers dba_name when present", () => {
    expect(computeOrgDisplayName("Acme Manufacturing Inc.", "Acme")).toBe("Acme");
  });

  it("uses legal_name when dba is absent", () => {
    expect(computeOrgDisplayName("Acme Manufacturing Inc.", null)).toBe(
      "Acme Manufacturing Inc.",
    );
  });
});

describe("assertManufacturerKindImmutable", () => {
  const existing: ManufacturerDetailRow = {
    id: "party-1",
    kind: "person",
    display_name: "Ada Lovelace",
    legal_name: null,
    first_name: "Ada",
    last_name: "Lovelace",
    dba_name: null,
  };

  it("allows patch without kind", () => {
    expect(() => assertManufacturerKindImmutable(existing, undefined)).not.toThrow();
  });

  it("rejects kind changes", () => {
    expect(() =>
      assertManufacturerKindImmutable(existing, "organization"),
    ).toThrow(ValidationError);
  });
});

describe("PartyRoleActionSchema", () => {
  it("rejects unknown keys", () => {
    const parsed = PartyRoleActionSchema.safeParse({ role: "vendor", extra: true });
    expect(parsed.success).toBe(false);
  });
});
