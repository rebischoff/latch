import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import { EstimateListPatchSchema } from "../../../modules/estimate/generated/estimate_list.schema.generated";

export const EstimateListListQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

export type EstimateListRow = {
  estimate_date: string | null;
  id: string;
  name: string;
  status: string;
  title: string;
};

const formatEstimateListRow = (row: EstimateListRow): Record<string, unknown> => ({
  estimate_date: row.estimate_date,
  id: row.id,
  name: row.name,
  status: row.status,
  title: row.title,
});

export const projectEstimateListRow = (
  row: EstimateListRow,
  manifest: Manifest,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.summary?.includes("read")) {
    dto.summary = {
      id: row.id,
      title: row.title,
      status: row.status,
      estimate_date: row.estimate_date,
      name: row.name,
    };
  }

  return dto;
};

const applyEstimateListPatch = (
  row: EstimateListRow,
  patch: Record<string, unknown>,
): EstimateListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof EstimateListPatchSchema>;

  if (typed.summary?.id !== undefined) {
    next.id = typed.summary.id;
  }
  if (typed.summary?.title !== undefined) {
    next.title = typed.summary.title;
  }
  if (typed.summary?.status !== undefined) {
    next.status = typed.summary.status;
  }
  if (typed.summary?.estimate_date !== undefined) {
    next.estimate_date = typed.summary.estimate_date;
  }
  if (typed.summary?.name !== undefined) {
    next.name = typed.summary.name;
  }

  return next;
};

export const estimateListDescriptor: SurfaceDescriptor<EstimateListRow> = {
  surfaceId: "estimate_list",
  anchorTable: "estimate",
  capabilities: ["list"],
  patchSchema: EstimateListPatchSchema,
  listQuerySchema: EstimateListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "summary",
  projectRow: projectEstimateListRow,
  applyPatch: applyEstimateListPatch,
  auditSnapshot: formatEstimateListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
