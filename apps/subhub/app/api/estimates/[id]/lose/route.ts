import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ForbiddenError, surfaceAllows } from "@latch/contracts";

import { getPool, resolveContextFresh } from "@/lib/latch";
import { loseEstimate } from "@/lib/estimates/repository";

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

    if (!surfaceAllows(ctx.manifest, "lose")) {
      throw new ForbiddenError();
    }

    const pool = getPool();
    await loseEstimate(pool, ctx.principal.id, estimateId);
    return jsonSuccess({ id: estimateId }, ctx.manifest);
  });
