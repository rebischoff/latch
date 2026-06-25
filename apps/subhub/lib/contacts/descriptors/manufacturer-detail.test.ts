import type { Manifest } from "@latch/contracts";
import { describe, expect, it } from "vitest";

import {
  projectManufacturerDetailRow,
  type ManufacturerDetailRow,
  type ManufacturerDetailRelated,
} from "./manufacturer-detail";

const fullManifest: Manifest = {
  surface: "manufacturer_detail",
  fields: {
    profile: ["read", "write"],
    phones: ["read", "write"],
    emails: ["read", "write"],
  },
  actions: ["read", "write", "delete"],
};

const personRow: ManufacturerDetailRow = {
  id: "party-1",
  kind: "person",
  display_name: "Ada Lovelace",
  legal_name: null,
  first_name: "Ada",
  last_name: "Lovelace",
  dba_name: null,
};

const orgRow: ManufacturerDetailRow = {
  id: "party-2",
  kind: "organization",
  display_name: "Acme Mfg",
  legal_name: "Acme Manufacturing Inc.",
  first_name: null,
  last_name: null,
  dba_name: "Acme",
};

const related: ManufacturerDetailRelated = {
  phones: [{ id: "ph-1", label: "main", number: "555-0100", is_primary: true }],
  emails: [
    { id: "em-1", label: "sales", address: "sales@acme.com", is_primary: true },
  ],
  also_roles: [{ role: "vendor" }],
};

describe("projectManufacturerDetailRow", () => {
  it("projects kind-specific person profile with also_roles", () => {
    const dto = projectManufacturerDetailRow(personRow, fullManifest, related);

    expect(dto).toEqual({
      id: "party-1",
      profile: {
        id: "party-1",
        kind: "person",
        display_name: "Ada Lovelace",
        first_name: "Ada",
        last_name: "Lovelace",
        also_roles: [{ role: "vendor" }],
      },
      phones: related.phones,
      emails: related.emails,
    });
  });

  it("projects kind-specific organization profile", () => {
    const dto = projectManufacturerDetailRow(orgRow, fullManifest, {
      ...related,
      also_roles: [],
    });

    expect(dto.profile).toEqual({
      id: "party-2",
      kind: "organization",
      display_name: "Acme Mfg",
      legal_name: "Acme Manufacturing Inc.",
      dba_name: "Acme",
    });
  });

  it("omits forbidden fields from the DTO", () => {
    const dto = projectManufacturerDetailRow(personRow, {
      ...fullManifest,
      fields: { profile: ["read"] },
    }, related);

    expect(dto).toEqual({
      id: "party-1",
      profile: {
        id: "party-1",
        kind: "person",
        display_name: "Ada Lovelace",
        first_name: "Ada",
        last_name: "Lovelace",
        also_roles: [{ role: "vendor" }],
      },
    });
    expect(dto).not.toHaveProperty("phones");
    expect(dto).not.toHaveProperty("emails");
  });
});
