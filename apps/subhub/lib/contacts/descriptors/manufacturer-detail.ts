import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import type {
  ContactDetailRelated,
  ContactDetailRelatedPatch,
  ContactDetailStoreRelated,
  PartyEmailPatchRow,
  PartyEmailRow,
  PartyPhonePatchRow,
  PartyPhoneRow,
} from "./contact-detail";

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

/** Hand-written — codegen stubs collections with placeholder `user_id`. */
export const ManufacturerDetailPatchSchema = z
  .object({
    profile: z
      .object({
        id: z.string().optional(),
        kind: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        legal_name: z.string().nullable().optional(),
        dba_name: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
    phones: z.array(PartyPhonePatchElementSchema).optional(),
    emails: z.array(PartyEmailPatchElementSchema).optional(),
  })
  .strict();

/** POST body — `profile.kind` required; kind-specific name fields required on create. */
export const ManufacturerDetailCreateSchema = z
  .object({
    profile: z
      .object({
        kind: z.enum(["person", "organization"]),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        legal_name: z.string().optional(),
        dba_name: z.string().nullable().optional(),
      })
      .strict()
      .superRefine((profile, ctx) => {
        if (profile.kind === "person") {
          if (!profile.first_name?.trim()) {
            ctx.addIssue({
              code: "custom",
              message: "first_name is required for person manufacturers",
              path: ["first_name"],
            });
          }
          if (profile.last_name === undefined) {
            ctx.addIssue({
              code: "custom",
              message: "last_name is required for person manufacturers",
              path: ["last_name"],
            });
          }
        } else if (!profile.legal_name?.trim()) {
          ctx.addIssue({
            code: "custom",
            message: "legal_name is required for organization manufacturers",
            path: ["legal_name"],
          });
        }
      }),
    phones: z.array(PartyPhonePatchElementSchema).optional(),
    emails: z.array(PartyEmailPatchElementSchema).optional(),
  })
  .strict();

export type ManufacturerDetailRow = {
  dba_name: string | null;
  display_name: string;
  first_name: string | null;
  id: string;
  kind: string;
  last_name: string | null;
  legal_name: string | null;
};

export type ManufacturerDetailWriteRow = ManufacturerDetailRow;

export type PartyAlsoRoleRow = {
  role: string;
};

export type ManufacturerDetailRelated = ContactDetailRelated & {
  also_roles: PartyAlsoRoleRow[];
};

export type ManufacturerDetailRelatedPatch = ContactDetailRelatedPatch;

export type ManufacturerDetailStoreRelated =
  | ManufacturerDetailRelated
  | ManufacturerDetailRelatedPatch;

const normalizeManufacturerDetailRelated = (
  related: ManufacturerDetailStoreRelated,
): ManufacturerDetailRelated => ({
  phones: (related.phones ?? []) as PartyPhoneRow[],
  emails: (related.emails ?? []) as PartyEmailRow[],
  also_roles: (related as ManufacturerDetailRelated).also_roles ?? [],
});

const projectManufacturerProfile = (
  row: ManufacturerDetailRow,
  related: ManufacturerDetailRelated,
): Record<string, unknown> => {
  const base = {
    id: row.id,
    kind: row.kind,
    display_name: row.display_name,
  };

  const profile =
    row.kind === "person"
      ? {
          ...base,
          first_name: row.first_name ?? "",
          last_name: row.last_name ?? "",
        }
      : {
          ...base,
          legal_name: row.legal_name,
          dba_name: row.dba_name,
        };

  if (related.also_roles.length > 0) {
    return { ...profile, also_roles: related.also_roles };
  }

  return profile;
};

const formatManufacturerDetailRow = (
  row: ManufacturerDetailRow,
): Record<string, unknown> => ({
  dba_name: row.dba_name,
  display_name: row.display_name,
  first_name: row.first_name,
  id: row.id,
  kind: row.kind,
  last_name: row.last_name,
  legal_name: row.legal_name,
});

export const projectManufacturerDetailRow = (
  row: ManufacturerDetailRow,
  manifest: Manifest,
  related: ManufacturerDetailStoreRelated,
): Record<string, unknown> => {
  const normalized = normalizeManufacturerDetailRelated(related);
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = projectManufacturerProfile(row, normalized);
  }

  if (manifest.fields.phones?.includes("read")) {
    dto.phones = normalized.phones;
  }

  if (manifest.fields.emails?.includes("read")) {
    dto.emails = normalized.emails;
  }

  return dto;
};

const applyManufacturerDetailPatch = (
  row: ManufacturerDetailRow,
  patch: Record<string, unknown>,
): ManufacturerDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof ManufacturerDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.kind !== undefined) {
    next.kind = typed.profile.kind;
  }
  if (typed.profile?.first_name !== undefined) {
    next.first_name = typed.profile.first_name;
  }
  if (typed.profile?.last_name !== undefined) {
    next.last_name = typed.profile.last_name;
  }
  if (typed.profile?.legal_name !== undefined) {
    next.legal_name = typed.profile.legal_name;
  }
  if (typed.profile?.dba_name !== undefined) {
    next.dba_name = typed.profile.dba_name;
  }

  return next;
};

export const manufacturerDetailDescriptor: SurfaceDescriptor<
  ManufacturerDetailRow,
  ManufacturerDetailStoreRelated
> = {
  surfaceId: "manufacturer_detail",
  anchorTable: "party",
  capabilities: ["detail"],
  patchSchema: ManufacturerDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectManufacturerDetailRow,
  applyPatch: applyManufacturerDetailPatch,
  applyRelatedPatch: (_entityId, patch) => {
    const typed = patch as z.infer<typeof ManufacturerDetailPatchSchema>;
    const related: ManufacturerDetailRelatedPatch = {};

    if (typed.phones !== undefined) {
      related.phones = typed.phones as PartyPhonePatchRow[];
    }
    if (typed.emails !== undefined) {
      related.emails = typed.emails as PartyEmailPatchRow[];
    }

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatManufacturerDetailRow,
  deleteAuditSnapshot: (row, related) => ({
    ...formatManufacturerDetailRow(row),
    phones: normalizeManufacturerDetailRelated(related).phones,
    emails: normalizeManufacturerDetailRelated(related).emails,
  }),
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
