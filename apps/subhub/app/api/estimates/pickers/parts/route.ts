import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { fieldAllows, ForbiddenError, ValidationError } from "@latch/contracts";

import { getPool, resolveContext } from "@/lib/latch";
import { loadMergedBucketForLine } from "@/lib/estimates/repository/estimate-bucket-specs";
import { resolveFilteredParts } from "@/lib/estimates/repository/estimate-part-resolver";
import { loadFilteredPartsForEstimateLine } from "@/lib/estimates/repository/estimate-part-picker";
import { assertSurfaceRead } from "@/lib/surfaces/assert-surface-read";

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "estimate_detail" });
    assertSurfaceRead(ctx);

    if (!fieldAllows(ctx.manifest, "line_items", "read")) {
      throw new ForbiddenError();
    }

    const params = new URL(request.url).searchParams;
    const itemId = params.get("item_id")?.trim();
    if (!itemId) {
      throw new ValidationError("item_id is required", {
        field: "item_id",
        code: "required",
      });
    }

    const pool = getPool();
    const estimateId = params.get("estimate_id")?.trim();
    const lineId = params.get("line_id")?.trim();
    const estimateScopeId = params.get("estimate_scope_id")?.trim();
    const siteZoneId = params.get("site_zone_id")?.trim() ?? null;

    let parts;

    if (estimateId && lineId) {
      parts = await loadFilteredPartsForEstimateLine(pool, estimateId, lineId, itemId);
    } else if (estimateScopeId) {
      const bucket = await loadMergedBucketForLine(
        pool,
        estimateScopeId,
        siteZoneId,
        lineId ?? null,
      );
      parts = await resolveFilteredParts(pool, itemId, bucket);
    } else {
      throw new ValidationError("estimate_id+line_id or estimate_scope_id is required", {
        field: "estimate_scope_id",
        code: "required",
      });
    }

    return jsonSuccess({ parts }, ctx.manifest);
  });
