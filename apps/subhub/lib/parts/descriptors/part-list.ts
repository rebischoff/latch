import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import { PartListPatchSchema } from "../../../modules/part/generated/part_list.schema.generated";

export const PartListListQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

export type PartListRow = {
  description: string;
  display_name: string;
  id: string;
  manufacturer_party_id: string;
  mpn: string;
};

const formatPartListRow = (row: PartListRow): Record<string, unknown> => ({
  description: row.description,
  display_name: row.display_name,
  id: row.id,
  manufacturer_party_id: row.manufacturer_party_id,
  mpn: row.mpn,
});

export const projectPartListRow = (
  row: PartListRow,
  manifest: Manifest,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.summary?.includes("read")) {
    dto.summary = {
      id: row.id,
      mpn: row.mpn,
      description: row.description,
      manufacturer_party_id: row.manufacturer_party_id,
      display_name: row.display_name,
    };
  }

  return dto;
};

const applyPartListPatch = (
  row: PartListRow,
  patch: Record<string, unknown>,
): PartListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof PartListPatchSchema>;

  if (typed.summary?.id !== undefined) {
    next.id = typed.summary.id;
  }
  if (typed.summary?.mpn !== undefined) {
    next.mpn = typed.summary.mpn;
  }
  if (typed.summary?.description !== undefined) {
    next.description = typed.summary.description;
  }
  if (typed.summary?.manufacturer_party_id !== undefined) {
    next.manufacturer_party_id = typed.summary.manufacturer_party_id;
  }
  if (typed.summary?.display_name !== undefined) {
    next.display_name = typed.summary.display_name;
  }

  return next;
};

export const partListDescriptor: SurfaceDescriptor<PartListRow> = {
  surfaceId: "part_list",
  anchorTable: "manufacturer_part",
  capabilities: ["list"],
  patchSchema: PartListPatchSchema,
  listQuerySchema: PartListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "summary",
  projectRow: projectPartListRow,
  applyPatch: applyPartListPatch,
  auditSnapshot: formatPartListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
