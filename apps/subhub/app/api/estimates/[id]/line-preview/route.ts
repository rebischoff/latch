import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import {
  fieldAllows,
  ForbiddenError,
  surfaceAllows,
  ValidationError,
} from "@latch/contracts";

import { getPool, resolveContext } from "@/lib/latch";
import {
  EstimateLinePreviewRequestSchema,
  previewEstimateLines,
} from "@/lib/estimates/repository/estimate-line-preview";
import { assertSurfaceRead } from "@/lib/surfaces/assert-surface-read";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = async (
  request: Request,
  routeContext: RouteContext,
): Promise<Response> =>
  withApiHandler(async () => {
    const { id: estimateId } = await routeContext.params;
    const ctx = await resolveContext({ surfaceId: "estimate_detail" });
    assertSurfaceRead(ctx);

    if (
      !fieldAllows(ctx.manifest, "line_items", "read") &&
      !fieldAllows(ctx.manifest, "line_items", "write")
    ) {
      throw new ForbiddenError();
    }

    if (!surfaceAllows(ctx.manifest, "read") && !surfaceAllows(ctx.manifest, "write")) {
      throw new ForbiddenError();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Invalid JSON body", { code: "invalid_json" });
    }

    const parsed = EstimateLinePreviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid line preview payload", {
        code: "invalid_body",
        issues: parsed.error.issues,
      });
    }

    const pool = getPool();
    const result = await previewEstimateLines(pool, estimateId, parsed.data);
    return jsonSuccess(result, ctx.manifest);
  });
