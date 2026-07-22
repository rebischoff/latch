import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ForbiddenError, surfaceAllows } from "@latch/contracts";

import { getPool, resolveContextFresh } from "@/lib/latch";
import { recreateMissingJobs } from "@/lib/estimates/repository";

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

    // Recreate uses the dedicated `create_job` grant (W1b / ST5).
    if (!surfaceAllows(ctx.manifest, "create_job")) {
      throw new ForbiddenError();
    }

    const pool = getPool();
    const result = await recreateMissingJobs(pool, ctx.principal.id, estimateId);
    return jsonSuccess(result, ctx.manifest);
  });
