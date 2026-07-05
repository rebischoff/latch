// DO NOT EDIT — generated from site_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const SiteDetailFieldIds = {
  profile: "profile",
  customer_party: "customer_party",
  property_owner_party: "property_owner_party",
  contacts: "contacts",
  scopes: "scopes",
} as const;

export type SiteDetailFieldId = (typeof SiteDetailFieldIds)[keyof typeof SiteDetailFieldIds];

export const siteDetailColumnMap = {
  profile: ["site.id", "site.name"],
  customer_party: ["site.customer_party_id"],
  property_owner_party: ["site.property_owner_party_id"],
  contacts: [],
  scopes: [],
} as const satisfies Record<SiteDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const SiteDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    name: z.string(),
  }),
  customer_party: z.object({
    customer_party_id: z.string().nullable(),
  }),
  property_owner_party: z.object({
    property_owner_party_id: z.string().nullable(),
  }),
  contacts: z.array(z.object({ user_id: z.string() })),
  scopes: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const SiteDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  customer_party: z
    .object({
      customer_party_id: z.string().nullable().optional(),
    })
    .optional(),
  property_owner_party: z
    .object({
      property_owner_party_id: z.string().nullable().optional(),
    })
    .optional(),
  contacts: z.array(z.object({ user_id: z.string() })).optional(),
  scopes: z.array(z.object({ user_id: z.string() })).optional(),
});

export type SiteDetailDto = z.infer<typeof SiteDetailSchema>;
export type SiteDetailPatchDto = z.infer<typeof SiteDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const siteDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "site_detail",
  fieldIds: Object.values(SiteDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
