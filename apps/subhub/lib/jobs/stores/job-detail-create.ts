import { writeAudit } from "@latch/audit";
import {
  ConflictError,
  ForbiddenError,
  narrowPatchSchema,
  surfaceAllows,
  ValidationError,
  type PermissionContext,
} from "@latch/contracts";
import type { SurfaceDal } from "@latch/dal";
import type { Pool } from "pg";
import { z } from "zod";

import {
  JobDetailCreateSchema,
  jobDetailDescriptor,
  type JobDetailRow,
  type JobDetailWriteRow,
} from "../descriptors/job-detail";
import { insertJob, loadJobDetail } from "../repository";

export const parseJobCreateBody = (
  ctx: PermissionContext,
  body: unknown,
): z.infer<typeof JobDetailCreateSchema> => {
  if (!surfaceAllows(ctx.manifest, "write")) {
    throw new ForbiddenError();
  }

  const schema = narrowPatchSchema(JobDetailCreateSchema, ctx.manifest);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  return parsed.data;
};

export const createJobRowFromBody = (
  id: string,
  body: z.infer<typeof JobDetailCreateSchema>,
): JobDetailRow => ({
  estimate_display_title: null,
  estimate_id: null,
  id,
  job_kind: "project",
  site_display_name: "",
  site_id: body.profile.site_id,
  status: "planned",
  title: body.profile.title,
});

const hasLineItemsPatch = (body: unknown): boolean => {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  return (body as { line_items?: unknown }).line_items !== undefined;
};

const assertPatchAllowed = (existing: JobDetailRow, body: unknown): void => {
  if (existing.status === "cancelled") {
    throw new ConflictError("Cannot modify a cancelled job");
  }

  if (hasLineItemsPatch(body)) {
    throw new ValidationError("Validation failed", {
      formErrors: [],
      fieldErrors: {
        line_items: ["Unknown field"],
      },
    });
  }
};

export const extendJobDetailDal = (
  pool: Pool,
  getActorId: () => Promise<string>,
  jobDetailBaseDal: SurfaceDal,
): SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
} => ({
  ...jobDetailBaseDal,
  patch: async (ctx, id, body) => {
    const existing = await loadJobDetail(pool, id);
    if (!existing) {
      return jobDetailBaseDal.patch(ctx, id, body);
    }

    assertPatchAllowed(existing, body);
    await jobDetailBaseDal.patch(ctx, id, body);
    return jobDetailBaseDal.get(ctx, id);
  },
  create: async (ctx, id, body) => {
    const input = parseJobCreateBody(ctx, body);

    if (await loadJobDetail(pool, id)) {
      throw new ConflictError("Job already exists");
    }

    const row = createJobRowFromBody(id, input);
    const writeRow: JobDetailWriteRow = {
      id: row.id,
      title: row.title,
      site_id: row.site_id,
      job_kind: row.job_kind,
      status: row.status,
    };
    const actorId = await getActorId();
    await insertJob(pool, actorId, writeRow, {
      stakeholders: input.stakeholders,
    });

    const fieldIds = ["profile"];
    if (input.stakeholders !== undefined) {
      fieldIds.push("stakeholders");
    }

    await writeAudit({
      actorId: ctx.principal.id,
      action: "insert",
      tableName: jobDetailDescriptor.anchorTable,
      recordId: id,
      moduleId: ctx.surface,
      fieldIds,
      before: null,
      after: jobDetailDescriptor.auditSnapshot(row),
    });

    return jobDetailBaseDal.get(ctx, id);
  },
});
