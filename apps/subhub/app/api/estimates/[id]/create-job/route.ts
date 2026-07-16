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

    // Recreate reuses the same `win` grant (W1b).
    if (!surfaceAllows(ctx.manifest, "win")) {
      throw new ForbiddenError();
    }

    const pool = getPool();
    const result = await recreateMissingJobs(pool, ctx.principal.id, estimateId);
    return jsonSuccess(result, ctx.manifest);
  });
