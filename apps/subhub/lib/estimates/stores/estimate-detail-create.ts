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
  EstimateDetailCreateSchema,
  estimateDetailDescriptor,
  type EstimateDetailRow,
  type EstimateDetailWriteRow,
} from "../descriptors/estimate-detail";
import { insertEstimate, loadEstimateDetail } from "../repository";

export const parseEstimateCreateBody = (
  ctx: PermissionContext,
  body: unknown,
): z.infer<typeof EstimateDetailCreateSchema> => {
  if (!surfaceAllows(ctx.manifest, "write")) {
    throw new ForbiddenError();
  }

  const schema = narrowPatchSchema(EstimateDetailCreateSchema, ctx.manifest);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  return parsed.data;
};

export const createEstimateRowFromBody = (
  id: string,
  body: z.infer<typeof EstimateDetailCreateSchema>,
): EstimateDetailRow => ({
  id,
  title: body.profile.title,
  site_id: body.profile.site_id,
  site_display_name: "",
  status: "draft",
  estimate_date: body.profile.estimate_date ?? null,
  valid_until: body.profile.valid_until ?? null,
  source_estimate_id: body.profile.source_estimate_id ?? null,
  item_id: body.profile.item_id ?? null,
});

const hasLineItemsPatch = (body: unknown): boolean => {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  return (body as { line_items?: unknown }).line_items !== undefined;
};

const hasConditionsPatch = (body: unknown): boolean => {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  return (body as { conditions?: unknown }).conditions !== undefined;
};

const assertCollectionsPatchAllowed = (status: string, body: unknown): void => {
  if (status !== "won" && status !== "sent") {
    return;
  }

  if (hasLineItemsPatch(body) || hasConditionsPatch(body)) {
    throw new ConflictError(
      status === "sent"
        ? "Cannot modify line items or conditions on a sent estimate"
        : "Cannot modify line items or conditions on a won estimate",
    );
  }
};

export const extendEstimateDetailDal = (
  pool: Pool,
  getActorId: () => Promise<string>,
  estimateDetailBaseDal: SurfaceDal,
): SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
} => ({
  ...estimateDetailBaseDal,
  patch: async (ctx, id, body) => {
    const existing = await loadEstimateDetail(pool, id);
    if (!existing) {
      return estimateDetailBaseDal.patch(ctx, id, body);
    }

    assertCollectionsPatchAllowed(existing.status, body);
    await estimateDetailBaseDal.patch(ctx, id, body);
    return estimateDetailBaseDal.get(ctx, id);
  },
  create: async (ctx, id, body) => {
    const input = parseEstimateCreateBody(ctx, body);

    if (await loadEstimateDetail(pool, id)) {
      throw new ConflictError("Estimate already exists");
    }

    const row = createEstimateRowFromBody(id, input);
    const writeRow: EstimateDetailWriteRow = {
      id: row.id,
      title: row.title,
      site_id: row.site_id,
      estimate_date: row.estimate_date,
      valid_until: row.valid_until,
      source_estimate_id: row.source_estimate_id,
      item_id: row.item_id,
    };
    const actorId = await getActorId();
    await insertEstimate(pool, actorId, writeRow, {
      stakeholders: input.stakeholders,
      conditions: input.conditions,
      line_items: input.line_items,
    });

    const fieldIds = ["profile"];
    if (input.stakeholders !== undefined) {
      fieldIds.push("stakeholders");
    }
    if (input.conditions !== undefined) {
      fieldIds.push("conditions");
    }
    if (input.line_items !== undefined) {
      fieldIds.push("line_items");
    }

    await writeAudit({
      actorId: ctx.principal.id,
      action: "insert",
      tableName: estimateDetailDescriptor.anchorTable,
      recordId: id,
      moduleId: ctx.surface,
      fieldIds,
      before: null,
      after: estimateDetailDescriptor.auditSnapshot(row),
    });

    return estimateDetailBaseDal.get(ctx, id);
  },
});
