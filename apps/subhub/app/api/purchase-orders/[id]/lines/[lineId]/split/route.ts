import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ForbiddenError, surfaceAllows, ValidationError } from "@latch/contracts";
import { z } from "zod";

import { getPool, resolveContextFresh } from "@/lib/latch";
import { splitPurchaseOrderLineShipment } from "@/lib/purchase-orders/repository";

type RouteContext = { params: Promise<{ id: string; lineId: string }> };

const SplitSchema = z
  .object({
    nearQuantity: z.number().positive(),
    nearEtaDate: z.string().nullable().optional(),
    backorderEtaDate: z.string().nullable().optional(),
  })
  .strict();

export const POST = async (
  request: Request,
  routeContext: RouteContext,
): Promise<Response> =>
  withApiHandler(async () => {
    const { id, lineId } = await routeContext.params;
    const ctx = await resolveContextFresh({
      surfaceId: "purchase_order_detail",
      entityId: id,
    });

    if (!surfaceAllows(ctx.manifest, "write")) {
      throw new ForbiddenError();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Invalid JSON body", { code: "invalid_json" });
    }

    const parsed = SplitSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid split payload", {
        code: "invalid_body",
        issues: parsed.error.issues,
      });
    }

    const result = await splitPurchaseOrderLineShipment(
      getPool(),
      ctx.principal.id,
      lineId,
      parsed.data,
    );
    return jsonSuccess(result, ctx.manifest);
  });
