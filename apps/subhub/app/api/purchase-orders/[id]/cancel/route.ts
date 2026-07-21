import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ForbiddenError, surfaceAllows, ValidationError } from "@latch/contracts";
import { z } from "zod";

import { getPool, resolveContextFresh } from "@/lib/latch";
import {
  cancelPurchaseOrder,
  previewCancelWarning,
} from "@/lib/purchase-orders/repository";

type RouteContext = { params: Promise<{ id: string }> };

const CancelSchema = z
  .object({
    level: z.enum(["header", "line", "shipment"]),
    purchaseOrderLineId: z.string().optional(),
    purchaseOrderLineShipmentId: z.string().optional(),
    previewOnly: z.boolean().optional(),
  })
  .strict();

export const POST = async (
  request: Request,
  routeContext: RouteContext,
): Promise<Response> =>
  withApiHandler(async () => {
    const { id } = await routeContext.params;
    const ctx = await resolveContextFresh({
      surfaceId: "purchase_order_detail",
      entityId: id,
    });

    if (!surfaceAllows(ctx.manifest, "cancel")) {
      throw new ForbiddenError();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Invalid JSON body", { code: "invalid_json" });
    }

    const parsed = CancelSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid cancel payload", {
        code: "invalid_body",
        issues: parsed.error.issues,
      });
    }

    const pool = getPool();
    if (parsed.data.previewOnly) {
      const warningLevel = await previewCancelWarning(
        pool,
        ctx.principal.id,
        id,
        parsed.data,
      );
      return jsonSuccess({ warningLevel }, ctx.manifest);
    }

    const result = await cancelPurchaseOrder(
      pool,
      ctx.principal.id,
      id,
      parsed.data,
    );
    return jsonSuccess(result, ctx.manifest);
  });
