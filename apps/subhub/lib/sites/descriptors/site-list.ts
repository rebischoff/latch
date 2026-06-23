import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import { SiteListPatchSchema } from "../../../modules/site/generated/site_list.schema.generated";

export const SiteListListQuerySchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

export type SiteListRow = {
  id: string;
  name: string;
};

const formatSiteListRow = (row: SiteListRow): Record<string, unknown> => ({
  id: row.id,
  name: row.name,
});

export const projectSiteListRow = (
  row: SiteListRow,
  manifest: Manifest,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.summary?.includes("read")) {
    dto.summary = { id: row.id, name: row.name };
  }

  return dto;
};

const applySiteListPatch = (
  row: SiteListRow,
  patch: Record<string, unknown>,
): SiteListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof SiteListPatchSchema>;

  if (typed.summary?.id !== undefined) {
    next.id = typed.summary.id;
  }
  if (typed.summary?.name !== undefined) {
    next.name = typed.summary.name;
  }

  return next;
};

export const siteListDescriptor: SurfaceDescriptor<SiteListRow> = {
  surfaceId: "site_list",
  anchorTable: "site",
  capabilities: ["list"],
  patchSchema: SiteListPatchSchema,
  listQuerySchema: SiteListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "summary",
  projectRow: projectSiteListRow,
  applyPatch: applySiteListPatch,
  auditSnapshot: formatSiteListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
