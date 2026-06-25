import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import { JobListPatchSchema } from "../../../modules/job/generated/job_list.schema.generated";

export const JobListListQuerySchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

export type JobListRow = {
  id: string;
  site_display_name: string;
  title: string;
};

const formatJobListRow = (row: JobListRow): Record<string, unknown> => ({
  id: row.id,
  site_display_name: row.site_display_name,
  title: row.title,
});

export const projectJobListRow = (
  row: JobListRow,
  manifest: Manifest,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.summary?.includes("read")) {
    dto.summary = {
      id: row.id,
      title: row.title,
      site_display_name: row.site_display_name,
    };
  }

  return dto;
};

const applyJobListPatch = (
  row: JobListRow,
  patch: Record<string, unknown>,
): JobListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof JobListPatchSchema>;

  if (typed.summary?.id !== undefined) {
    next.id = typed.summary.id;
  }
  if (typed.summary?.title !== undefined) {
    next.title = typed.summary.title;
  }
  if (typed.summary?.name !== undefined) {
    next.site_display_name = typed.summary.name;
  }

  return next;
};

export const jobListDescriptor: SurfaceDescriptor<JobListRow> = {
  surfaceId: "job_list",
  anchorTable: "job",
  capabilities: ["list"],
  patchSchema: JobListPatchSchema,
  listQuerySchema: JobListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "summary",
  projectRow: projectJobListRow,
  applyPatch: applyJobListPatch,
  auditSnapshot: formatJobListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
