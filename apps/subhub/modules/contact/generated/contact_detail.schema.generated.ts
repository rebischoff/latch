// DO NOT EDIT — generated from contact_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const ContactDetailFieldIds = {
  profile: "profile",
  phones: "phones",
  emails: "emails",
} as const;

export type ContactDetailFieldId = (typeof ContactDetailFieldIds)[keyof typeof ContactDetailFieldIds];

export const contactDetailColumnMap = {
  profile: ["party.id", "party.kind", "party.display_name", "party.legal_name", "party.notes"],
  phones: [],
  emails: [],
} as const satisfies Record<ContactDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const ContactDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    kind: z.string(),
    display_name: z.string(),
    legal_name: z.string().nullable(),
    notes: z.string().nullable(),
  }),
  phones: z.array(z.object({ user_id: z.string() })),
  emails: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const ContactDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      kind: z.string().optional(),
      display_name: z.string().optional(),
      legal_name: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    })
    .optional(),
  phones: z.array(z.object({ user_id: z.string() })).optional(),
  emails: z.array(z.object({ user_id: z.string() })).optional(),
});

export type ContactDetailDto = z.infer<typeof ContactDetailSchema>;
export type ContactDetailPatchDto = z.infer<typeof ContactDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const contactDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "contact_detail",
  fieldIds: Object.values(ContactDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
