// DO NOT EDIT — generated from contact_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const ContactListFieldIds = {
  summary: "summary",
} as const;

export type ContactListFieldId = (typeof ContactListFieldIds)[keyof typeof ContactListFieldIds];

export const contactListColumnMap = {
  summary: ["party.id", "party.display_name", "party.kind"],
} as const satisfies Record<ContactListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const ContactListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    display_name: z.string(),
    kind: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const ContactListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      display_name: z.string().optional(),
      kind: z.string().optional(),
    })
    .optional(),
});

export type ContactListDto = z.infer<typeof ContactListSchema>;
export type ContactListPatchDto = z.infer<typeof ContactListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const contactListSurfacePolicyDef = defineSurfacePolicy({
  surface: "contact_list",
  fieldIds: Object.values(ContactListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
});
