import { describe, expect, it } from "vitest";

import type { Manifest } from "@latch/contracts";

import { projectContactDetailRow } from "../../apps/subhub/lib/contacts/descriptors.js";
import { projectContactListRow } from "../../apps/subhub/modules/contact/generated/contact_list.glue.generated.js";

const baseDetailManifest = (): Manifest => ({
  surface: "contact_detail",
  actions: ["read"],
  fields: {},
  rowScope: "all",
});

const baseListManifest = (): Manifest => ({
  surface: "contact_list",
  actions: ["read"],
  fields: {},
  rowScope: "all",
});

const sampleRow = {
  id: "seed-party-acme",
  kind: "organization",
  display_name: "Acme Electric",
  legal_name: "Acme Electric LLC",
  notes: "Net 30",
};

const sampleRelated = {
  phones: [
    {
      id: "seed-phone-acme-main",
      label: "main",
      number: "555-0100",
      is_primary: true,
    },
  ],
  emails: [
    {
      id: "seed-email-acme-billing",
      label: "billing",
      address: "billing@acme-electric.example",
      is_primary: true,
    },
  ],
};

describe("subhub contact projection", () => {
  it("omits profile when read is not granted on contact_detail", () => {
    const dto = projectContactDetailRow(
      sampleRow,
      baseDetailManifest(),
      sampleRelated,
    );

    expect(dto).toEqual({ id: "seed-party-acme" });
    expect(dto).not.toHaveProperty("profile");
    expect(dto).not.toHaveProperty("phones");
    expect(dto).not.toHaveProperty("emails");
  });

  it("includes profile when read is granted on contact_detail", () => {
    const manifest: Manifest = {
      ...baseDetailManifest(),
      fields: { profile: ["read"] },
    };

    const dto = projectContactDetailRow(sampleRow, manifest, sampleRelated);

    expect(dto.profile).toEqual({
      id: "seed-party-acme",
      kind: "organization",
      display_name: "Acme Electric",
      legal_name: "Acme Electric LLC",
      notes: "Net 30",
    });
    expect(dto).not.toHaveProperty("phones");
    expect(dto).not.toHaveProperty("emails");
  });

  it("includes phones and emails when read is granted on those fields", () => {
    const manifest: Manifest = {
      ...baseDetailManifest(),
      fields: {
        profile: ["read"],
        phones: ["read"],
        emails: ["read"],
      },
    };

    const dto = projectContactDetailRow(sampleRow, manifest, sampleRelated);

    expect(dto.phones).toEqual(sampleRelated.phones);
    expect(dto.emails).toEqual(sampleRelated.emails);
  });

  it("omits summary when read is not granted on contact_list", () => {
    const dto = projectContactListRow(
      {
        id: "seed-party-acme",
        display_name: "Acme Electric",
        kind: "organization",
      },
      baseListManifest(),
      undefined,
    );

    expect(dto).toEqual({ id: "seed-party-acme" });
    expect(dto).not.toHaveProperty("summary");
  });
});
