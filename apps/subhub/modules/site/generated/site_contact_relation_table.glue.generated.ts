// DO NOT EDIT — generated from site_contact_relation_table.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  SiteContactRelationTablePatchSchema,
} from "./site_contact_relation_table.schema.generated";

export type SiteContactRelationTableRow = {
  display_name: string;
  id: string;
  sort_order: number;
};

const formatSiteContactRelationTableRow = (row: SiteContactRelationTableRow): Record<string, unknown> => ({
  display_name: row.display_name,
  id: row.id,
  sort_order: row.sort_order,
});

export const projectSiteContactRelationTableRow = (
  row: SiteContactRelationTableRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.display_name?.includes("read")) {
    dto.display_name = { id: row.id, display_name: row.display_name };
  }
  if (manifest.fields.sort_order?.includes("read")) {
    dto.sort_order = { sort_order: row.sort_order };
  }
  return dto;
};

export const applySiteContactRelationTablePatch = (
  row: SiteContactRelationTableRow,
  patch: Record<string, unknown>,
): SiteContactRelationTableRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof SiteContactRelationTablePatchSchema>;

  if (typed.display_name?.id !== undefined) {
    next.id = typed.display_name.id;
  }
  if (typed.display_name?.display_name !== undefined) {
    next.display_name = typed.display_name.display_name;
  }
  if (typed.sort_order?.sort_order !== undefined) {
    next.sort_order = typed.sort_order.sort_order;
  }
  return next;
};

export const siteContactRelationTableDescriptor: SurfaceDescriptor<SiteContactRelationTableRow> = {
  surfaceId: "site_contact_relation_table",
  anchorTable: "site_contact_relation",
  capabilities: ["detail"],
  patchSchema: SiteContactRelationTablePatchSchema,
  deleteAuditFieldId: "display_name",
  projectRow: projectSiteContactRelationTableRow,
  applyPatch: applySiteContactRelationTablePatch,
  auditSnapshot: formatSiteContactRelationTableRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
