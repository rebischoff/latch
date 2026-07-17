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
  RequestedOrderDetailCreateSchema,
  requestedOrderDetailDescriptor,
  type RequestedOrderDetailRow,
  type RequestedOrderDetailWriteRow,
} from "../descriptors/requested-order-detail";
import {
  insertRequestedOrder,
  loadRequestedOrderDetail,
  resolveEmployeePartyIdForPrincipal,
} from "../repository";

export const parseRequestedOrderCreateBody = (
  ctx: PermissionContext,
  body: unknown,
): z.infer<typeof RequestedOrderDetailCreateSchema> => {
  if (!surfaceAllows(ctx.manifest, "write")) {
    throw new ForbiddenError();
  }

  const schema = narrowPatchSchema(RequestedOrderDetailCreateSchema, ctx.manifest);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  return parsed.data;
};

const createRequestedOrderRowFromBody = (
  id: string,
  body: z.infer<typeof RequestedOrderDetailCreateSchema>,
  requestedBy: string | null,
): RequestedOrderDetailRow => ({
  id,
  job_id: body.profile.job_id,
  job_title: "",
  requested_by: requestedBy,
  requested_by_display_name: null,
  requested_at: new Date().toISOString(),
  note: body.profile.note ?? "",
});

export const extendRequestedOrderDetailDal = (
  pool: Pool,
  getActorId: () => Promise<string>,
  requestedOrderDetailBaseDal: SurfaceDal,
): SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
} => ({
  ...requestedOrderDetailBaseDal,
  create: async (ctx, id, body) => {
    const input = parseRequestedOrderCreateBody(ctx, body);

    if (await loadRequestedOrderDetail(pool, id)) {
      throw new ConflictError("Requisition already exists");
    }

    const actorId = await getActorId();
    const requestedBy = await resolveEmployeePartyIdForPrincipal(pool, ctx.principal.id);
    const row = createRequestedOrderRowFromBody(id, input, requestedBy);
    const writeRow: RequestedOrderDetailWriteRow = {
      id: row.id,
      job_id: row.job_id,
      note: row.note,
    };

    await insertRequestedOrder(pool, actorId, writeRow, requestedBy, {
      line_items: input.line_items,
    });

    const fieldIds = ["profile"];
    if (input.line_items !== undefined) {
      fieldIds.push("line_items");
    }

    await writeAudit({
      actorId: ctx.principal.id,
      action: "insert",
      tableName: requestedOrderDetailDescriptor.anchorTable,
      recordId: id,
      moduleId: ctx.surface,
      fieldIds,
      before: null,
      after: requestedOrderDetailDescriptor.auditSnapshot(row),
    });

    return requestedOrderDetailBaseDal.get(ctx, id);
  },
});
