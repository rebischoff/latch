import { z } from "zod";

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";

export type SiteDetailRow = {
  customer_display_name: string | null;
  customer_party_id: string | null;
  id: string;
  name: string;
};

export type SiteContactRow = {
  display_name: string;
  id: string;
  kind: string;
  party_id: string;
  relation_id: string;
  relation_label: string;
  sort_order: number;
};

export type SiteZoneRow = {
  can_delete: boolean;
  id: string;
  name: string;
  sort_order: number;
  status: string;
  zones: SiteZoneRow[];
};

export type SiteScopeRow = {
  can_delete: boolean;
  id: string;
  name: string;
  root_item_id: string;
  root_item_name: string;
  sort_order: number;
  status: string;
  zones: SiteZoneRow[];
};

export type SiteZonePatchRow = {
  id?: string;
  name: string;
  sort_order?: number;
  zones: SiteZonePatchRow[];
};

export type SiteScopePatchRow = {
  id?: string;
  name: string;
  root_item_id: string;
  sort_order?: number;
  zones: SiteZonePatchRow[];
};

export type SiteScopesPatch = {
  scopes?: SiteScopePatchRow[];
};

export type SiteDetailRelated = {
  contacts: SiteContactRow[];
  scopes: SiteScopeRow[];
};

export type SiteContactPatchRow = {
  id?: string;
  party_id: string;
  relation_id: string;
};

export type SiteDetailRelatedPatch = {
  contacts?: SiteContactPatchRow[];
  scopes?: SiteScopePatchRow[];
};

export type SiteDetailStoreRelated =
  | SiteDetailRelated
  | SiteDetailRelatedPatch;

const SiteContactPatchElementSchema = z
  .object({
    id: z.string().optional(),
    party_id: z.string(),
    relation_id: z.string(),
  })
  .strict();

const SiteZonePatchElementSchema: z.ZodType<SiteZonePatchRow> = z.lazy(() =>
  z
    .object({
      id: z.string().optional(),
      name: z.string(),
      sort_order: z.number().optional(),
      zones: z.array(SiteZonePatchElementSchema),
    })
    .strict(),
);

const SiteScopePatchElementSchema = z
  .object({
    id: z.string().optional(),
    root_item_id: z.string(),
    name: z.string(),
    sort_order: z.number().optional(),
    zones: z.array(SiteZonePatchElementSchema),
  })
  .strict();

/** Hand-written — codegen stubs `contacts` with placeholder `user_id`. */
export const SiteDetailPatchSchema = z
  .object({
    profile: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
      })
      .strict()
      .optional(),
    customer_party: z
      .object({
        customer_party_id: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
    contacts: z.array(SiteContactPatchElementSchema).optional(),
    scopes: z.array(SiteScopePatchElementSchema).optional(),
  })
  .strict();

/** POST body — same field-keyed shape as PATCH; `profile.name` required. */
export const SiteDetailCreateSchema = z
  .object({
    profile: z
      .object({
        name: z.string().min(1),
      })
      .strict(),
    customer_party: z
      .object({
        customer_party_id: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
    contacts: z.array(SiteContactPatchElementSchema).optional(),
    scopes: z.array(SiteScopePatchElementSchema).optional(),
  })
  .strict();

const formatSiteDetailRow = (row: SiteDetailRow): Record<string, unknown> => ({
  customer_display_name: row.customer_display_name,
  customer_party_id: row.customer_party_id,
  id: row.id,
  name: row.name,
});

const normalizeSiteDetailRelated = (
  related: SiteDetailStoreRelated,
): SiteDetailRelated => ({
  contacts: (related.contacts ?? []) as SiteContactRow[],
  scopes: (related.scopes ?? []) as SiteScopeRow[],
});

export const projectSiteDetailRow = (
  row: SiteDetailRow,
  manifest: Manifest,
  related: SiteDetailStoreRelated,
): Record<string, unknown> => {
  const normalized = normalizeSiteDetailRelated(related);
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = { id: row.id, name: row.name };
  }

  if (manifest.fields.customer_party?.includes("read")) {
    dto.customer_party = {
      customer_party_id: row.customer_party_id,
      customer_display_name: row.customer_display_name,
    };
  }

  if (manifest.fields.contacts?.includes("read")) {
    dto.contacts = normalized.contacts;
  }

  if (manifest.fields.scopes?.includes("read")) {
    dto.scopes = normalized.scopes;
  }

  return dto;
};

const applySiteDetailPatch = (
  row: SiteDetailRow,
  patch: Record<string, unknown>,
): SiteDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof SiteDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.name !== undefined) {
    next.name = typed.profile.name;
  }
  if (typed.customer_party?.customer_party_id !== undefined) {
    next.customer_party_id = typed.customer_party.customer_party_id;
  }

  return next;
};

export const siteDetailDescriptor: SurfaceDescriptor<
  SiteDetailRow,
  SiteDetailStoreRelated
> = {
  surfaceId: "site_detail",
  anchorTable: "site",
  capabilities: ["detail"],
  patchSchema: SiteDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectSiteDetailRow,
  applyPatch: applySiteDetailPatch,
  applyRelatedPatch: (_entityId, patch) => {
    const typed = patch as z.infer<typeof SiteDetailPatchSchema>;
    const related: SiteDetailRelatedPatch = {};

    if (typed.contacts !== undefined) {
      related.contacts = typed.contacts;
    }

    if (typed.scopes !== undefined) {
      related.scopes = typed.scopes;
    }

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatSiteDetailRow,
  deleteAuditSnapshot: (row, related) => {
    const normalized = normalizeSiteDetailRelated(related);
    return {
      ...formatSiteDetailRow(row),
      contacts: normalized.contacts,
      scopes: normalized.scopes,
    };
  },
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
