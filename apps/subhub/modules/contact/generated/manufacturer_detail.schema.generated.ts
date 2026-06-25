// DO NOT EDIT — generated from manufacturer_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const ManufacturerDetailFieldIds = {
  profile: "profile",
  phones: "phones",
  emails: "emails",
} as const;

export type ManufacturerDetailFieldId = (typeof ManufacturerDetailFieldIds)[keyof typeof ManufacturerDetailFieldIds];

export const manufacturerDetailColumnMap = {
  profile: ["party.id", "party.kind", "party.display_name", "party.legal_name", "party_person.first_name", "party_person.last_name", "party_organization.dba_name"],
  phones: [],
  emails: [],
} as const satisfies Record<ManufacturerDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const ManufacturerDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    kind: z.string(),
    display_name: z.string(),
    legal_name: z.string().nullable(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    dba_name: z.string().nullable(),
  }),
  phones: z.array(z.object({ user_id: z.string() })),
  emails: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const ManufacturerDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      kind: z.string().optional(),
      display_name: z.string().optional(),
      legal_name: z.string().nullable().optional(),
      first_name: z.string().nullable().optional(),
      last_name: z.string().nullable().optional(),
      dba_name: z.string().nullable().optional(),
    })
    .optional(),
  phones: z.array(z.object({ user_id: z.string() })).optional(),
  emails: z.array(z.object({ user_id: z.string() })).optional(),
});

export type ManufacturerDetailDto = z.infer<typeof ManufacturerDetailSchema>;
export type ManufacturerDetailPatchDto = z.infer<typeof ManufacturerDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const manufacturerDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "manufacturer_detail",
  fieldIds: Object.values(ManufacturerDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete", "add_role", "remove_role"],
});
