import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

export type SiteDetailRow = {
  customer_display_name: string | null;
  customer_party_id: string | null;
  id: string;
  name: string;
  property_owner_display_name: string | null;
  property_owner_party_id: string | null;
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

export type SiteDetailRelated = {
  contacts: SiteContactRow[];
};

export type SiteContactPatchRow = {
  id?: string;
  party_id: string;
  relation_id: string;
};

export type SiteDetailRelatedPatch = {
  contacts?: SiteContactPatchRow[];
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
    property_owner_party: z
      .object({
        property_owner_party_id: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
    contacts: z.array(SiteContactPatchElementSchema).optional(),
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
    property_owner_party: z
      .object({
        property_owner_party_id: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
    contacts: z.array(SiteContactPatchElementSchema).optional(),
  })
  .strict();

const formatSiteDetailRow = (row: SiteDetailRow): Record<string, unknown> => ({
  customer_display_name: row.customer_display_name,
  customer_party_id: row.customer_party_id,
  id: row.id,
  name: row.name,
  property_owner_display_name: row.property_owner_display_name,
  property_owner_party_id: row.property_owner_party_id,
});

const normalizeSiteDetailRelated = (
  related: SiteDetailStoreRelated,
): SiteDetailRelated => ({
  contacts: (related.contacts ?? []) as SiteContactRow[],
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

  if (manifest.fields.property_owner_party?.includes("read")) {
    dto.property_owner_party = {
      property_owner_party_id: row.property_owner_party_id,
      property_owner_display_name: row.property_owner_display_name,
    };
  }

  if (manifest.fields.contacts?.includes("read")) {
    dto.contacts = normalized.contacts;
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
  if (typed.property_owner_party?.property_owner_party_id !== undefined) {
    next.property_owner_party_id = typed.property_owner_party.property_owner_party_id;
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

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatSiteDetailRow,
  deleteAuditSnapshot: (row, related) => ({
    ...formatSiteDetailRow(row),
    contacts: normalizeSiteDetailRelated(related).contacts,
  }),
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
