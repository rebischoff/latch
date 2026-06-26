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
    is_login_email: z.boolean().optional(),
  })
  .strict();

export const EmployeeDetailPatchSchema = z
  .object({
    profile: z
      .object({
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        nick_name: z.string().nullable().optional(),
        avatar_url: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
    phones: z.array(PartyPhonePatchElementSchema).optional(),
    emails: z.array(PartyEmailPatchElementSchema).optional(),
  })
  .strict();

export const EmployeeDetailCreateSchema = z
  .object({
    profile: z
      .object({
        first_name: z.string().min(1, "first_name is required"),
        last_name: z.string(),
        nick_name: z.string().nullable().optional(),
        avatar_url: z.string().nullable().optional(),
      })
      .strict(),
    phones: z.array(PartyPhonePatchElementSchema).optional(),
    emails: z.array(PartyEmailPatchElementSchema).optional(),
  })
  .strict();

export type EmployeeDetailRow = {
  avatar_url: string | null;
  display_name: string;
  first_name: string;
  id: string;
  last_name: string;
  latch_user_id: string | null;
  nick_name: string | null;
};

export type EmployeeDetailWriteRow = EmployeeDetailRow;

export type EmployeeStaffRow = {
  is_staff: boolean;
  party_id: string;
};

export type EmployeeDetailRelated = ContactDetailRelated & {
  staff: EmployeeStaffRow;
};

export type EmployeeDetailRelatedPatch = ContactDetailRelatedPatch;

export type EmployeeDetailStoreRelated =
  | EmployeeDetailRelated
  | EmployeeDetailRelatedPatch;

const normalizeEmployeeDetailRelated = (
  related: EmployeeDetailStoreRelated,
): EmployeeDetailRelated => ({
  phones: (related.phones ?? []) as PartyPhoneRow[],
  emails: (related.emails ?? []) as PartyEmailRow[],
  staff:
    (related as EmployeeDetailRelated).staff ??
    ({ party_id: "", is_staff: false } satisfies EmployeeStaffRow),
});

const projectEmployeeProfile = (row: EmployeeDetailRow): Record<string, unknown> => ({
  id: row.id,
  display_name: row.display_name,
  first_name: row.first_name,
  last_name: row.last_name,
  nick_name: row.nick_name,
  avatar_url: row.avatar_url,
  latch_user_id: row.latch_user_id,
});

const formatEmployeeDetailRow = (
  row: EmployeeDetailRow,
): Record<string, unknown> => ({
  avatar_url: row.avatar_url,
  display_name: row.display_name,
  first_name: row.first_name,
  id: row.id,
  last_name: row.last_name,
  latch_user_id: row.latch_user_id,
  nick_name: row.nick_name,
});

export const projectEmployeeDetailRow = (
  row: EmployeeDetailRow,
  manifest: Manifest,
  related: EmployeeDetailStoreRelated,
): Record<string, unknown> => {
  const normalized = normalizeEmployeeDetailRelated(related);
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = projectEmployeeProfile(row);
  }

  if (manifest.fields.phones?.includes("read")) {
    dto.phones = normalized.phones;
  }

  if (manifest.fields.emails?.includes("read")) {
    dto.emails = normalized.emails;
  }

  if (manifest.fields.staff?.includes("read")) {
    dto.staff = normalized.staff;
  }

  return dto;
};

const applyEmployeeDetailPatch = (
  row: EmployeeDetailRow,
  patch: Record<string, unknown>,
): EmployeeDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof EmployeeDetailPatchSchema>;

  if (typed.profile?.first_name !== undefined) {
    next.first_name = typed.profile.first_name;
  }
  if (typed.profile?.last_name !== undefined) {
    next.last_name = typed.profile.last_name;
  }
  if (typed.profile?.nick_name !== undefined) {
    next.nick_name = typed.profile.nick_name;
  }
  if (typed.profile?.avatar_url !== undefined) {
    next.avatar_url = typed.profile.avatar_url;
  }

  return next;
};

export const employeeDetailDescriptor: SurfaceDescriptor<
  EmployeeDetailRow,
  EmployeeDetailStoreRelated
> = {
  surfaceId: "employee_detail",
  anchorTable: "employee",
  capabilities: ["detail"],
  patchSchema: EmployeeDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectEmployeeDetailRow,
  applyPatch: applyEmployeeDetailPatch,
  applyRelatedPatch: (_entityId, patch) => {
    const typed = patch as z.infer<typeof EmployeeDetailPatchSchema>;
    const related: EmployeeDetailRelatedPatch = {};

    if (typed.phones !== undefined) {
      related.phones = typed.phones as PartyPhonePatchRow[];
    }
    if (typed.emails !== undefined) {
      related.emails = typed.emails as PartyEmailPatchRow[];
    }

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatEmployeeDetailRow,
  deleteAuditSnapshot: (row, related) => ({
    ...formatEmployeeDetailRow(row),
    phones: normalizeEmployeeDetailRelated(related).phones,
    emails: normalizeEmployeeDetailRelated(related).emails,
    staff: normalizeEmployeeDetailRelated(related).staff,
  }),
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
