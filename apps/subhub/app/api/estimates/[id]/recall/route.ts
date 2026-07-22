import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ForbiddenError, surfaceAllows } from "@latch/contracts";

import { getPool, resolveContextFresh } from "@/lib/latch";
import { recallEstimate } from "@/lib/estimates/repository";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = async (
  _request: Request,
  routeContext: RouteContext,
): Promise<Response> =>
  withApiHandler(async () => {
    const { id: estimateId } = await routeContext.params;
    const ctx = await resolveContextFresh({
      surfaceId: "estimate_detail",
      entityId: estimateId,
    });

    if (!surfaceAllows(ctx.manifest, "recall")) {
      throw new ForbiddenError();
    }

    const pool = getPool();
    await recallEstimate(pool, ctx.principal.id, estimateId);
    return jsonSuccess({ id: estimateId }, ctx.manifest);
  });
