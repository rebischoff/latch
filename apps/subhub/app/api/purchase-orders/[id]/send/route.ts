import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ForbiddenError, surfaceAllows } from "@latch/contracts";

import { getPool, resolveContextFresh } from "@/lib/latch";
import { sendPurchaseOrder } from "@/lib/purchase-orders/repository";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = async (
  _request: Request,
  routeContext: RouteContext,
): Promise<Response> =>
  withApiHandler(async () => {
    const { id } = await routeContext.params;
    const ctx = await resolveContextFresh({
      surfaceId: "purchase_order_detail",
      entityId: id,
    });

    if (!surfaceAllows(ctx.manifest, "send")) {
      throw new ForbiddenError();
    }

    await sendPurchaseOrder(getPool(), ctx.principal.id, id);
    return jsonSuccess({ id, status: "sent" }, ctx.manifest);
  });
