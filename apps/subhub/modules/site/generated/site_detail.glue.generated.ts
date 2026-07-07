// DO NOT EDIT — generated from site_detail.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  SiteDetailPatchSchema,
} from "./site_detail.schema.generated";

export type SiteDetailRow = {
  customer_party_id: string | null;
  id: string;
  name: string;
};

const formatSiteDetailRow = (row: SiteDetailRow): Record<string, unknown> => ({
  customer_party_id: row.customer_party_id,
  id: row.id,
  name: row.name,
});

export const projectSiteDetailRow = (
  row: SiteDetailRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = { id: row.id, name: row.name };
  }
  if (manifest.fields.customer_party?.includes("read")) {
    dto.customer_party = { customer_party_id: row.customer_party_id };
  }
  return dto;
};

export const applySiteDetailPatch = (
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

export const siteDetailDescriptor: SurfaceDescriptor<SiteDetailRow> = {
  surfaceId: "site_detail",
  anchorTable: "site",
  capabilities: ["detail"],
  patchSchema: SiteDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectSiteDetailRow,
  applyPatch: applySiteDetailPatch,
  auditSnapshot: formatSiteDetailRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
