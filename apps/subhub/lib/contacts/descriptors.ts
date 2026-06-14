import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

export {
  contactListDescriptor,
  projectContactListRow,
  type ContactListRow,
} from "../../modules/contact/generated/contact_list.glue.generated.js";

export {
  customerListDescriptor,
  projectCustomerListRow,
  type CustomerListRow,
} from "../../modules/contact/generated/customer_list.glue.generated.js";

export {
  vendorListDescriptor,
  projectVendorListRow,
  type VendorListRow,
} from "../../modules/contact/generated/vendor_list.glue.generated.js";

export {
  manufacturerListDescriptor,
  projectManufacturerListRow,
  type ManufacturerListRow,
} from "../../modules/contact/generated/manufacturer_list.glue.generated.js";

export type ContactDetailRow = {
  display_name: string;
  id: string;
  kind: string;
  legal_name: string | null;
  notes: string | null;
};

export type PartyPhoneRow = {
  id: string;
  label: string;
  number: string;
  is_primary: boolean;
};

export type PartyEmailRow = {
  id: string;
  address: string;
  is_primary: boolean;
  label: string;
};

export type ContactDetailRelated = {
  phones: PartyPhoneRow[];
  emails: PartyEmailRow[];
};

export type PartyPhonePatchRow = {
  id?: string;
  label: string;
  number: string;
  is_primary: boolean;
};

export type PartyEmailPatchRow = {
  id?: string;
  label: string;
  address: string;
  is_primary: boolean;
};

export type ContactDetailRelatedPatch = {
  phones?: PartyPhonePatchRow[];
  emails?: PartyEmailPatchRow[];
};

export type ContactDetailStoreRelated =
  | ContactDetailRelated
  | ContactDetailRelatedPatch;

const PartyPhonePatchElementSchema = z
  .object({
    id: z.string().optional(),
    label: z.string(),
    number: z.string(),
    is_primary: z.boolean(),
  })
  .strict();

const PartyEmailPatchElementSchema = z
  .object({
    id: z.string().optional(),
    label: z.string(),
    address: z.string(),
    is_primary: z.boolean(),
  })
  .strict();

export const ContactDetailPatchSchema = z
  .object({
    profile: z
      .object({
        id: z.string().optional(),
        kind: z.string().optional(),
        display_name: z.string().optional(),
        legal_name: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
    phones: z.array(PartyPhonePatchElementSchema).optional(),
    emails: z.array(PartyEmailPatchElementSchema).optional(),
  })
  .strict();

const normalizeContactDetailRelated = (
  related: ContactDetailStoreRelated,
): ContactDetailRelated => ({
  phones: (related.phones ?? []) as PartyPhoneRow[],
  emails: (related.emails ?? []) as PartyEmailRow[],
});

const formatContactDetailRow = (row: ContactDetailRow): Record<string, unknown> => ({
  display_name: row.display_name,
  id: row.id,
  kind: row.kind,
  legal_name: row.legal_name,
  notes: row.notes,
});

export const projectContactDetailRow = (
  row: ContactDetailRow,
  manifest: Manifest,
  related: ContactDetailStoreRelated,
): Record<string, unknown> => {
  const normalized = normalizeContactDetailRelated(related);
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = {
      id: row.id,
      kind: row.kind,
      display_name: row.display_name,
      legal_name: row.legal_name,
      notes: row.notes,
    };
  }

  if (manifest.fields.phones?.includes("read")) {
    dto.phones = normalized.phones;
  }

  if (manifest.fields.emails?.includes("read")) {
    dto.emails = normalized.emails;
  }

  return dto;
};

export const applyContactDetailPatch = (
  row: ContactDetailRow,
  patch: Record<string, unknown>,
): ContactDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof ContactDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.kind !== undefined) {
    next.kind = typed.profile.kind;
  }
  if (typed.profile?.display_name !== undefined) {
    next.display_name = typed.profile.display_name;
  }
  if (typed.profile?.legal_name !== undefined) {
    next.legal_name = typed.profile.legal_name;
  }
  if (typed.profile?.notes !== undefined) {
    next.notes = typed.profile.notes;
  }

  return next;
};

export const contactDetailDescriptor: SurfaceDescriptor<
  ContactDetailRow,
  ContactDetailStoreRelated
> = {
  surfaceId: "contact_detail",
  anchorTable: "party",
  capabilities: ["detail"],
  patchSchema: ContactDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: (row, manifest, related) =>
    projectContactDetailRow(row, manifest, related),
  applyPatch: applyContactDetailPatch,
  applyRelatedPatch: (_entityId, patch) => {
    const typed = patch as z.infer<typeof ContactDetailPatchSchema>;
    const related: ContactDetailRelatedPatch = {};

    if (typed.phones !== undefined) {
      related.phones = typed.phones;
    }
    if (typed.emails !== undefined) {
      related.emails = typed.emails;
    }

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatContactDetailRow,
  deleteAuditSnapshot: (row, related) => ({
    ...formatContactDetailRow(row),
    phones: normalizeContactDetailRelated(related).phones,
    emails: normalizeContactDetailRelated(related).emails,
  }),
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
